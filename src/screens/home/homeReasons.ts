import { Ionicons } from '@expo/vector-icons';
import type { Contact, Event, EventType } from '../../types';

export const REASON_WINDOW_DAYS = 30;

type IconName = keyof typeof Ionicons.glyphMap;

export type ContactReason = {
  kind: 'birthday' | 'event';
  icon: IconName;
  text: string;
  date: string;
  daysUntil: number;
};

const EVENT_ICON: Record<EventType, IconName> = {
  birthday: 'gift-outline',
  anniversary: 'heart-outline',
  achievement: 'trophy-outline',
  milestone: 'flag-outline',
  holiday: 'sparkles-outline',
  custom: 'calendar-outline',
};

function daysUntilDate(iso: string, now: Date): number | null {
  const target = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

// Days until the next occurrence of this birthday, measured from `now` (clock-independent).
function daysUntilBirthday(iso: string, now: Date): number | null {
  const birthday = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(birthday.getTime())) return null;
  const next = new Date(now.getFullYear(), birthday.getMonth(), birthday.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (next < today) next.setFullYear(now.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

function relativeLabel(daysUntil: number): string {
  if (daysUntil <= 0) return 'today';
  if (daysUntil === 1) return 'tomorrow';
  return `in ${daysUntil} days`;
}

export function getContactReasons(
  contact: Contact,
  events: Event[],
  now: Date = new Date(),
  windowDays: number = REASON_WINDOW_DAYS,
): ContactReason[] {
  const reasons: ContactReason[] = [];

  const bdayDays = contact.birthday ? daysUntilBirthday(contact.birthday, now) : null;
  if (bdayDays !== null && bdayDays >= 0 && bdayDays <= windowDays && contact.birthday) {
    reasons.push({
      kind: 'birthday',
      icon: 'gift-outline',
      text: `Birthday ${relativeLabel(bdayDays)}`,
      date: contact.birthday,
      daysUntil: bdayDays,
    });
  }

  for (const e of events) {
    if (e.contactId !== contact.id) continue;
    const d = daysUntilDate(e.date, now);
    if (d === null || d < 0 || d > windowDays) continue;
    reasons.push({
      kind: 'event',
      icon: EVENT_ICON[e.type] ?? 'calendar-outline',
      text: `${e.title} ${relativeLabel(d)}`,
      date: e.date,
      daysUntil: d,
    });
  }

  return reasons.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function hasQualifyingReason(
  contact: Contact,
  events: Event[],
  now: Date = new Date(),
  windowDays: number = REASON_WINDOW_DAYS,
): boolean {
  return getContactReasons(contact, events, now, windowDays).length > 0;
}

export function getPeopleWithEvents(
  contacts: Contact[],
  events: Event[],
  excludeId?: string,
  now: Date = new Date(),
): Contact[] {
  return contacts
    .filter(c => c.id !== excludeId && hasQualifyingReason(c, events, now))
    .sort((a, b) => {
      const ra = getContactReasons(a, events, now)[0]?.daysUntil ?? 999;
      const rb = getContactReasons(b, events, now)[0]?.daysUntil ?? 999;
      return ra - rb;
    });
}
