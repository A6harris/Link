import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Contact } from '../../types';
import { loadContacts } from '../../utils/contactsStorage';
import { CONTACT_FREQUENCY_CONFIG, DEFAULT_CONTACT_FREQUENCY } from '../../constants/contactFrequency';
import type { ConnectionSuggestion } from './homeTypes';
import {
  FREQUENCY_BASE_SCORE,
  FREQUENCY_URGENCY_MULTIPLIER,
  weightedRandomSelect,
  daysSince,
  asUser,
} from './homeUtils';

export function useLocalConnectionSuggestions() {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const lastSuggestedFriendIdRef = useRef<string | null>(null);

  const scoreContact = useCallback((c: Contact): number => {
    const frequency = c.contactFrequency ?? DEFAULT_CONTACT_FREQUENCY;
    const config = CONTACT_FREQUENCY_CONFIG[frequency];
    const baseScore = FREQUENCY_BASE_SCORE[frequency];
    const urgencyScale = FREQUENCY_URGENCY_MULTIPLIER[frequency];
    const ds = daysSince(c.lastContacted);
    const ratio = config.days ? ds / config.days : 0;
    const approachingBoost = ratio < 1 ? ratio * 12 * urgencyScale : 0;
    const overdueBoost = ratio >= 1 ? Math.min(ratio - 1, 1.5) * 20 * urgencyScale : 0;
    const freshnessPenalty = ratio < 0.3 ? -5 * (1 - ratio / 0.3) : 0;
    const jitter = Math.random() * 30;
    return baseScore + approachingBoost + overdueBoost + freshnessPenalty + jitter;
  }, []);

  const compute = useCallback(async () => {
    setLoading(true);
    try {
      const contacts = await loadContacts();
      setAllContacts(contacts);

      const enriched: ConnectionSuggestion[] = contacts.map(c => {
        const score = scoreContact(c);
        const frequency = c.contactFrequency ?? DEFAULT_CONTACT_FREQUENCY;
        return {
          id: `local-${c.id}-${Math.random().toString(36).slice(2, 7)}`,
          friendId: c.id,
          friend: asUser(c),
          score,
          reasons: [
            { type: 'cadence' as const, description: `Cadence: ${CONTACT_FREQUENCY_CONFIG[frequency].label}` },
            c.lastContacted
              ? { description: `Last chatted ${daysSince(c.lastContacted)} days ago` }
              : { description: 'No recent contact recorded' },
          ],
          suggestedAt: new Date().toISOString(),
          meta: {
            lastContactedISO: c.lastContacted ?? null,
            frequency,
            birthday: c.birthday ?? null,
            notes: c.notes ?? null,
          },
        };
      });

      enriched.sort((a, b) => b.score - a.score);
      let candidatePool = enriched.slice(0, Math.min(15, enriched.length));
      const lastId = lastSuggestedFriendIdRef.current;
      if (lastId && candidatePool.length > 1) {
        candidatePool = candidatePool.filter(s => s.friendId !== lastId);
      }
      const selected = weightedRandomSelect(candidatePool, 10);
      selected.sort((a, b) => b.score - a.score);
      if (selected.length > 0) lastSuggestedFriendIdRef.current = selected[0].friendId;
      setSuggestions(selected);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [scoreContact]);

  useEffect(() => { compute(); }, [compute]);

  const topSuggestion = useMemo(() => suggestions[0], [suggestions]);

  return {
    loading,
    suggestions,
    topSuggestion,
    refresh: compute,
    generateNewSuggestion: compute,
    allContacts,
  };
}
