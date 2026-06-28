import { computeWeeklyGoal, getWeekBounds, resolveWeeklyGoal } from '../src/screens/home/weeklyGoal';
import type { Contact, ContactFrequency } from '../src/types';

// Wednesday 2026-06-17 — mid-week, so "this week" is Mon 2026-06-15 .. Mon 2026-06-22.
const NOW = new Date('2026-06-17T12:00:00');
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * MS_PER_DAY).toISOString();
}

function makeContact(id: string, freq: ContactFrequency, lastContacted: string | null): Contact {
  return {
    id,
    firstName: id,
    contactFrequency: freq,
    lastContacted,
    createdAt: NOW.toISOString(),
  };
}

describe('getWeekBounds', () => {
  it('starts the week on Monday 00:00', () => {
    const { weekStart, weekEnd } = getWeekBounds(NOW);
    const start = new Date(weekStart);
    expect(start.getDay()).toBe(1); // Monday
    expect(start.getHours()).toBe(0);
    expect(weekEnd - weekStart).toBe(7 * MS_PER_DAY);
  });
});

describe('computeWeeklyGoal', () => {
  it('counts 7 weekly contacts that are due this week', () => {
    const contacts = Array.from({ length: 7 }, (_, i) =>
      makeContact(`w${i}`, 'weekly', daysAgo(8)),
    );
    expect(computeWeeklyGoal(contacts, NOW)).toEqual({ goal: 7, done: 0, remaining: 7 });
  });

  it('keeps the goal stable as contacts are marked done this week', () => {
    const contacts = [
      ...Array.from({ length: 4 }, (_, i) => makeContact(`due${i}`, 'weekly', daysAgo(8))),
      ...Array.from({ length: 3 }, (_, i) => makeContact(`done${i}`, 'weekly', daysAgo(0))),
    ];
    // The 3 reached today are no longer "due" (next due is next week) but still
    // count toward this week's goal — denominator stays 7.
    expect(computeWeeklyGoal(contacts, NOW)).toEqual({ goal: 7, done: 3, remaining: 4 });
  });

  it('adds a monthly contact only on the week it falls due', () => {
    const weekly = Array.from({ length: 7 }, (_, i) => makeContact(`w${i}`, 'weekly', daysAgo(8)));

    // Monthly contacted 35 days ago → next due 5 days ago → counts this week.
    const dueMonthly = [...weekly, makeContact('m', 'monthly', daysAgo(35))];
    expect(computeWeeklyGoal(dueMonthly, NOW).goal).toBe(8);

    // Monthly contacted 10 days ago → next due ~20 days out → does not count.
    const notDueMonthly = [...weekly, makeContact('m', 'monthly', daysAgo(10))];
    expect(computeWeeklyGoal(notDueMonthly, NOW).goal).toBe(7);
  });

  it('treats a never-contacted contact as due immediately', () => {
    const contacts = [makeContact('new', 'monthly', null)];
    expect(computeWeeklyGoal(contacts, NOW)).toEqual({ goal: 1, done: 0, remaining: 1 });
  });

  it('counts overdue backlog toward this week', () => {
    // Quarterly (90d) contacted 200 days ago — long overdue, still owed.
    const contacts = [makeContact('q', 'quarterly', daysAgo(200))];
    expect(computeWeeklyGoal(contacts, NOW)).toEqual({ goal: 1, done: 0, remaining: 1 });
  });

  it('caps the overdue backlog at 7 extra per week', () => {
    // 20 never-contacted contacts are all pure overdue backlog. Without the cap
    // the goal would be 20; it should clamp to MAX_OVERDUE_BACKLOG (7).
    const contacts = Array.from({ length: 20 }, (_, i) => makeContact(`n${i}`, 'monthly', null));
    expect(computeWeeklyGoal(contacts, NOW)).toEqual({ goal: 7, done: 0, remaining: 7 });
  });

  it('does not cap contacts due this week or already done', () => {
    // 10 weekly contacts due this week + 3 reached this week — neither group is
    // backlog, so all 13 count even though that is above the backlog cap.
    const dueThisWeek = Array.from({ length: 10 }, (_, i) => makeContact(`w${i}`, 'weekly', daysAgo(8)));
    const doneThisWeek = Array.from({ length: 3 }, (_, i) => makeContact(`d${i}`, 'weekly', daysAgo(0)));
    expect(computeWeeklyGoal([...dueThisWeek, ...doneThisWeek], NOW)).toEqual({
      goal: 13,
      done: 3,
      remaining: 10,
    });
  });

  it('returns an empty goal when nothing is due or done this week', () => {
    // Quarterly contacted last week (3 days ago, before this Monday): next due
    // ~87 days out, and not reached during this week → contributes nothing.
    const contacts = [makeContact('q', 'quarterly', daysAgo(3))];
    expect(computeWeeklyGoal(contacts, NOW)).toEqual({ goal: 0, done: 0, remaining: 0 });
  });
});

describe('resolveWeeklyGoal', () => {
  const weekStart = getWeekBounds(NOW).weekStart;

  // Helper mirroring the screen flow: marking someone contacted sets their
  // lastContacted to "now" (this week).
  function markContacted(c: Contact): Contact {
    return { ...c, lastContacted: NOW.toISOString() };
  }

  it('establishes the week target when there is no snapshot', () => {
    const contacts = Array.from({ length: 20 }, (_, i) => makeContact(`n${i}`, 'monthly', null));
    const { goal, snapshot } = resolveWeeklyGoal(contacts, null, NOW);
    expect(goal).toEqual({ goal: 7, done: 0, remaining: 7 });
    expect(snapshot).toEqual({ weekStart, target: 7 });
  });

  it('decrements remaining by one per contact even when backlog exceeds the cap', () => {
    // 20 overdue contacts → capped target of 7. This is the bug scenario: with a
    // live recompute, marking a backlog contact would leave remaining pinned at 7
    // because the cap stays full while `done` climbs.
    let contacts = Array.from({ length: 20 }, (_, i) => makeContact(`n${i}`, 'monthly', null));
    const snapshot = { weekStart, target: 7 };

    contacts = contacts.map((c, i) => (i === 0 ? markContacted(c) : c));
    expect(resolveWeeklyGoal(contacts, snapshot, NOW).goal).toEqual({ goal: 7, done: 1, remaining: 6 });

    contacts = contacts.map((c, i) => (i === 1 ? markContacted(c) : c));
    expect(resolveWeeklyGoal(contacts, snapshot, NOW).goal).toEqual({ goal: 7, done: 2, remaining: 5 });
  });

  it('reaches "all caught up" once the frozen target is met', () => {
    const contacts = Array.from({ length: 20 }, (_, i) =>
      i < 7 ? markContacted(makeContact(`n${i}`, 'monthly', null)) : makeContact(`n${i}`, 'monthly', null),
    );
    expect(resolveWeeklyGoal(contacts, { weekStart, target: 7 }, NOW).goal).toEqual({
      goal: 7,
      done: 7,
      remaining: 0,
    });
  });

  it('lets the displayed goal grow past the frozen target for bonus connections', () => {
    // 8 of the 20 reached — one past the frozen target of 7. The denominator
    // grows with `done` so the bar never overflows; remaining stays at 0.
    const contacts = Array.from({ length: 20 }, (_, i) =>
      i < 8 ? markContacted(makeContact(`n${i}`, 'monthly', null)) : makeContact(`n${i}`, 'monthly', null),
    );
    expect(resolveWeeklyGoal(contacts, { weekStart, target: 7 }, NOW).goal).toEqual({
      goal: 8,
      done: 8,
      remaining: 0,
    });
  });

  it('re-establishes the target when the week rolls over', () => {
    const lastWeekStart = weekStart - 7 * MS_PER_DAY;
    const contacts = Array.from({ length: 3 }, (_, i) => makeContact(`n${i}`, 'monthly', null));
    const { goal, snapshot } = resolveWeeklyGoal(contacts, { weekStart: lastWeekStart, target: 7 }, NOW);
    expect(snapshot).toEqual({ weekStart, target: 3 });
    expect(goal).toEqual({ goal: 3, done: 0, remaining: 3 });
  });
});
