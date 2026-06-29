import type { Contact } from '../../types';
import { updateContact } from '../../utils/contactsStorage';
import { CONTACT_FREQUENCY_CONFIG, DEFAULT_CONTACT_FREQUENCY } from '../../constants/contactFrequency';
import type { FrequencyKey, User } from './homeTypes';

const CADENCE_PHRASE: Record<FrequencyKey, string> = {
  weekly: 'every week',
  biweekly: 'every couple of weeks',
  monthly: 'every month',
  quarterly: 'every few months',
  biannual: 'twice a year',
  annually: 'once a year',
};

// Hero subtitle: how often you usually talk + whether it's been a while.
export const cadenceSubtitle = (
  frequency: FrequencyKey,
  lastContactedISO?: string | null,
): string => {
  const phrase = CADENCE_PHRASE[frequency] ?? 'now and then';
  if (!lastContactedISO) return `You usually talk ${phrase} — time to reconnect`;
  const overdue = daysSince(lastContactedISO) >= CONTACT_FREQUENCY_CONFIG[frequency].days;
  return overdue
    ? `You usually talk ${phrase} — it's been a little while`
    : `You usually talk ${phrase} — you're on track`;
};

export const FREQUENCY_BASE_SCORE: Record<FrequencyKey, number> = {
  weekly: 45,
  biweekly: 42,
  monthly: 38,
  quarterly: 35,
  biannual: 32,
  annually: 30,
};

export const FREQUENCY_URGENCY_MULTIPLIER: Record<FrequencyKey, number> = {
  weekly: 1.2,
  biweekly: 1.1,
  monthly: 1.0,
  quarterly: 0.9,
  biannual: 0.8,
  annually: 0.7,
};

// Pure cadence/recency score with NO random jitter. Single source of truth for
// "how overdue is this contact." The home feed adds jitter on top for variety;
// notifications use this raw value so the nudged name is the genuinely most
// overdue person and stays stable between reschedules. Keep this in sync with
// scoreContact in useConnectionSuggestions.ts (which = this + jitter).
export const scoreContactStable = (c: Contact): number => {
  const frequency = c.contactFrequency ?? DEFAULT_CONTACT_FREQUENCY;
  const config = CONTACT_FREQUENCY_CONFIG[frequency];
  const baseScore = FREQUENCY_BASE_SCORE[frequency];
  const urgencyScale = FREQUENCY_URGENCY_MULTIPLIER[frequency];
  const ds = daysSince(c.lastContacted);
  const ratio = config.days ? ds / config.days : 0;
  const approachingBoost = ratio < 1 ? ratio * 12 * urgencyScale : 0;
  const overdueBoost = ratio >= 1 ? Math.min(ratio - 1, 1.5) * 20 * urgencyScale : 0;
  const freshnessPenalty = ratio < 0.3 ? -5 * (1 - ratio / 0.3) : 0;
  return baseScore + approachingBoost + overdueBoost + freshnessPenalty;
};

// Whether a contact is at or past their cadence (used to decide if a nudge is
// even warranted — we stay silent when nobody is actually due).
export const isContactDue = (c: Contact): boolean => {
  const frequency = c.contactFrequency ?? DEFAULT_CONTACT_FREQUENCY;
  const cadenceDays = CONTACT_FREQUENCY_CONFIG[frequency].days;
  return daysSince(c.lastContacted) >= cadenceDays;
};

export const weightedRandomSelect = <T extends { score: number }>(items: T[], count = 1): T[] => {
  if (items.length === 0) return [];
  if (items.length <= count) return items;
  const selected: T[] = [];
  const remaining = [...items];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const minScore = Math.min(...remaining.map(item => item.score));
    const weights = remaining.map(item => Math.max(item.score - minScore + 10, 1));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    let selectedIndex = 0;
    for (let j = 0; j < weights.length; j++) {
      random -= weights[j];
      if (random <= 0) { selectedIndex = j; break; }
    }
    selected.push(remaining[selectedIndex]);
    remaining.splice(selectedIndex, 1);
  }
  return selected;
};

export const daysSince = (dateIso?: string | null): number => {
  if (!dateIso) return 999;
  return Math.max(0, Math.floor((Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24)));
};

export const formatLastContacted = (iso?: string | null): string => {
  if (!iso) return 'Not recorded';
  const d = daysSince(iso);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  return `${d} days ago`;
};

// "Last contacted X days/months/years ago", or "New Contact" when never recorded.
export const formatLastContactedLong = (iso?: string | null): string => {
  if (!iso) return 'New Contact';
  const d = daysSince(iso);
  if (d === 0) return 'Last contacted today';
  if (d === 1) return 'Last contacted yesterday';
  if (d < 30) return `Last contacted ${d} days ago`;
  if (d < 365) {
    const m = Math.floor(d / 30);
    return `Last contacted ${m} ${m === 1 ? 'month' : 'months'} ago`;
  }
  const y = Math.floor(d / 365);
  return `Last contacted ${y} ${y === 1 ? 'year' : 'years'} ago`;
};

export const formatBirthday = (iso?: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
};

export const getDaysUntilBirthday = (iso?: string | null): number | null => {
  if (!iso) return null;
  const today = new Date();
  const birthday = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(birthday.getTime())) return null;
  birthday.setFullYear(today.getFullYear());
  if (birthday < today) birthday.setFullYear(today.getFullYear() + 1);
  return Math.ceil((birthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const fullName = (c: { firstName?: string; lastName?: string; username?: string }): string =>
  [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.username || 'Friend';

export const asUser = (c: Contact): User => ({
  id: c.id,
  firstName: c.firstName || '',
  lastName: c.lastName || '',
  username: (c.firstName || 'friend').toLowerCase(),
  profileImage: c.profileImage,
});

export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const formatDate = (): string =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// Takes the contact directly — no loadContacts() call needed (H9 fix)
export const markContactedToday = async (contact: Contact): Promise<Contact> => {
  const updated: Contact = {
    ...contact,
    lastContacted: new Date().toISOString(),
    lastContactedCount: 'Today',
  };
  await updateContact(updated);
  return updated;
};
