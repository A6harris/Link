import type { Contact } from '../../types';
import { CONTACT_FREQUENCY_CONFIG, DEFAULT_CONTACT_FREQUENCY } from '../../constants/contactFrequency';
import type { WeeklyGoal } from './homeTypes';
import type { WeeklyGoalSnapshot } from '../../utils/weeklyGoalStorage';

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
export const MAX_OVERDUE_BACKLOG = 7;

// The three groups that make up a week's connection load, split out so both the
// pure goal and the snapshot-aware resolver can share the bucketing pass.
//   1. done           -> already reached this week.
//   2. dueThisWeek    -> not reached, falls due on cadence during this week.
//   3. overdueBacklog -> not reached, already past due before this week began
//                        (including never-contacted contacts).
export type WeeklyBuckets = {
  weekStart: number;
  done: number;
  dueThisWeek: number;
  overdueBacklog: number;
};

export function computeWeeklyBuckets(contacts: Contact[], now: Date = new Date()): WeeklyBuckets {
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

  return { weekStart, done, dueThisWeek, overdueBacklog };
}

// The live target for a set of buckets: everything due/done this week plus the
// overdue backlog, with the backlog clamped to MAX_OVERDUE_BACKLOG.
function liveTarget(b: WeeklyBuckets): number {
  return b.done + b.dueThisWeek + Math.min(b.overdueBacklog, MAX_OVERDUE_BACKLOG);
}

// Pure, snapshot-free weekly goal. Recomputed fresh from contacts every call —
// this is the week-start target and is what the tests assert against.
//
// NOTE: on its own this is unstable across a week when the overdue backlog is
// larger than MAX_OVERDUE_BACKLOG: marking a backlog contact done moves them
// from `overdueBacklog` (pinned at the cap) into `done`, so the goal climbs by
// one and "N more this week" never drops. resolveWeeklyGoal fixes that.
export function computeWeeklyGoal(contacts: Contact[], now: Date = new Date()): WeeklyGoal {
  const b = computeWeeklyBuckets(contacts, now);
  const goal = liveTarget(b);
  return { goal, done: b.done, remaining: Math.max(0, goal - b.done) };
}

// Snapshot-aware weekly goal. Establishes the week's target once (the first time
// it is resolved in a given week) and then keeps that denominator frozen, so
// every contact marked done this week decrements `remaining` by exactly one.
//
// `done` may climb above the original target (bonus connections past the cap);
// the displayed goal grows with it so the progress bar never overflows, but the
// persisted target stays put so an undo returns `remaining` to where it was.
//
// Returns the goal to display plus the snapshot that should be persisted.
export function resolveWeeklyGoal(
  contacts: Contact[],
  snapshot: WeeklyGoalSnapshot | null,
  now: Date = new Date(),
): { goal: WeeklyGoal; snapshot: WeeklyGoalSnapshot } {
  const b = computeWeeklyBuckets(contacts, now);
  const isNewWeek = !snapshot || snapshot.weekStart !== b.weekStart;
  const target = isNewWeek ? liveTarget(b) : snapshot.target;
  const goal = Math.max(target, b.done);
  return {
    goal: { goal, done: b.done, remaining: Math.max(0, goal - b.done) },
    snapshot: { weekStart: b.weekStart, target },
  };
}
