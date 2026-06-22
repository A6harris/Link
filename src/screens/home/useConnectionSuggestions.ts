import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Contact, Event } from '../../types';
import { loadContacts } from '../../utils/contactsStorage';
import { loadEvents } from '../../utils/eventsStorage';
import { getOrCreateLocalUserId } from '../../utils/localUser';
import { CONTACT_FREQUENCY_CONFIG, DEFAULT_CONTACT_FREQUENCY } from '../../constants/contactFrequency';
import type { ConnectionSuggestion } from './homeTypes';
import {
  FREQUENCY_BASE_SCORE,
  FREQUENCY_URGENCY_MULTIPLIER,
  weightedRandomSelect,
  daysSince,
  asUser,
} from './homeUtils';
import { getPeopleWithEvents } from './homeReasons';
import { computeWeeklyGoal } from './weeklyGoal';

// Builds the enriched suggestion shape from a contact. Shared by the initial
// scoring pass and by promoting an arbitrary contact into the hero slot.
function buildSuggestion(c: Contact, score: number): ConnectionSuggestion {
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
}

export function useLocalConnectionSuggestions() {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
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

      const userId = await getOrCreateLocalUserId();
      setEvents(userId ? await loadEvents(userId) : []);

      const enriched: ConnectionSuggestion[] = contacts.map(c => buildSuggestion(c, scoreContact(c)));

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

  // Derived from the already-loaded contacts — no extra AsyncStorage read.
  // Recomputes whenever contacts change (e.g. after marking someone contacted).
  const weeklyGoal = useMemo(() => computeWeeklyGoal(allContacts), [allContacts]);

  // Contacts (other than the current hero) with an upcoming birthday or linked event.
  const peopleWithEvents = useMemo(
    () => getPeopleWithEvents(allContacts, events, topSuggestion?.friendId),
    [allContacts, events, topSuggestion?.friendId],
  );

  // Promotes a contact into the hero slot without re-rolling the random scoring.
  // Reuses an existing suggestion when present; otherwise builds one on the fly.
  const setHeroContact = useCallback((contactId: string) => {
    setSuggestions(prev => {
      const idx = prev.findIndex(s => s.friendId === contactId);
      if (idx === 0) return prev;
      if (idx > 0) {
        const next = [...prev];
        const [picked] = next.splice(idx, 1);
        lastSuggestedFriendIdRef.current = picked.friendId;
        return [picked, ...next];
      }
      const contact = allContacts.find(c => c.id === contactId);
      if (!contact) return prev;
      const built = buildSuggestion(contact, 0);
      lastSuggestedFriendIdRef.current = built.friendId;
      return [built, ...prev];
    });
  }, [allContacts]);

  // Quiet refresh: reloads contacts + events and re-syncs the existing suggestions
  // with the fresh data, WITHOUT re-rolling the order/scores. Use on tab focus so
  // edits/additions show up without changing who is suggested.
  const reloadData = useCallback(async () => {
    try {
      const contacts = await loadContacts();
      setAllContacts(contacts);

      const userId = await getOrCreateLocalUserId();
      setEvents(userId ? await loadEvents(userId) : []);

      setSuggestions(prev =>
        prev
          .map(s => {
            const c = contacts.find(ct => ct.id === s.friendId);
            return c ? { ...buildSuggestion(c, s.score), id: s.id } : null;
          })
          .filter((s): s is ConnectionSuggestion => s !== null),
      );
    } catch {
      // Leave current state in place on a transient read failure.
    }
  }, []);

  // Puts a previously shown suggestion back on top (e.g. after an undo) and syncs
  // the in-memory contact with the restored storage values, without re-rolling
  // the random scoring.
  const restoreSuggestion = useCallback((suggestion: ConnectionSuggestion, contact: Contact) => {
    lastSuggestedFriendIdRef.current = suggestion.friendId;
    setSuggestions(prev => [suggestion, ...prev.filter(s => s.friendId !== suggestion.friendId)]);
    setAllContacts(prev => prev.map(c => (c.id === contact.id ? contact : c)));
  }, []);

  return {
    loading,
    suggestions,
    topSuggestion,
    refresh: compute,
    generateNewSuggestion: compute,
    reloadData,
    restoreSuggestion,
    allContacts,
    events,
    peopleWithEvents,
    setHeroContact,
    weeklyGoal,
  };
}
