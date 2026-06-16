import type { Contact } from '../../types';
import { CONTACT_FREQUENCY_CONFIG, DEFAULT_CONTACT_FREQUENCY } from '../../constants/contactFrequency';
import type { WeeklyGoal } from './homeTypes';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Start (Monday 00:00 local) and exclusive end (next Monday 00:00) of the
// calendar week containing `now`.
export function getWeekBounds(now: Date = new Date()): { weekStart: number; weekEnd: number } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  // getDay(): 0=Sun..6=Sat. Days elapsed since the most recent Monday:
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { weekStart: start.getTime(), weekEnd: end.getTime() };
}

function cadenceDays(contact: Contact): number {
  const freq = contact.contactFrequency ?? DEFAULT_CONTACT_FREQUENCY;
  return (CONTACT_FREQUENCY_CONFIG[freq] ?? CONTACT_FREQUENCY_CONFIG[DEFAULT_CONTACT_FREQUENCY]).days;
}

// Timestamp at which the contact next falls due. A never-contacted contact is
// due immediately (sentinel 0, which is always before the end of the week).
function nextDueMs(contact: Contact): number {
  if (!contact.lastContacted) return 0;
  const last = new Date(contact.lastContacted).getTime();
  if (Number.isNaN(last)) return 0;
  return last + cadenceDays(contact) * MS_PER_DAY;
}

// The most contacts an overdue backlog can add to a single week's goal. Without
// this, importing or neglecting many contacts balloons the target into an
// unachievable "47 more connections this week".
const MAX_OVERDUE_BACKLOG = 7;

// How many connections are needed this week, and how many are already done.
//
// The goal is the sum of three groups:
//   1. Contacts already reached this week               -> counted as `done`.
//   2. Contacts that fall due *during* this week on their normal cadence.
//   3. Overdue backlog: contacts already past due before this week began
//      (including never-contacted contacts), capped at MAX_OVERDUE_BACKLOG.
//
// Counting reached-this-week contacts toward the goal keeps the denominator
// stable: once you reach a weekly contact their next-due date jumps to next
// week, but they still count as part of (and progress against) this week.
export function computeWeeklyGoal(contacts: Contact[], now: Date = new Date()): WeeklyGoal {
  const { weekStart, weekEnd } = getWeekBounds(now);
  let done = 0;
  let dueThisWeek = 0;
  let overdueBacklog = 0;

  for (const c of contacts) {
    const last = c.lastContacted ? new Date(c.lastContacted).getTime() : NaN;
    const contactedThisWeek = !Number.isNaN(last) && last >= weekStart && last < weekEnd;
    if (contactedThisWeek) {
      done += 1;
      continue;
    }

    const nextDue = nextDueMs(c);
    if (nextDue >= weekEnd) continue; // not due yet this week
    if (nextDue < weekStart) {
      overdueBacklog += 1; // already past due before this week began
    } else {
      dueThisWeek += 1; // falls due on cadence during this week
    }
  }

  const goal = done + dueThisWeek + Math.min(overdueBacklog, MAX_OVERDUE_BACKLOG);
  return { goal, done, remaining: Math.max(0, goal - done) };
}
