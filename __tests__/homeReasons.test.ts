import {
  getContactReasons,
  hasQualifyingReason,
  getPeopleWithEvents,
  REASON_WINDOW_DAYS,
} from '../src/screens/home/homeReasons';
import type { Contact, Event } from '../src/types';

const NOW = new Date('2026-06-20T12:00:00');

function contact(id: string, over: Partial<Contact> = {}): Contact {
  return { id, firstName: id, contactFrequency: 'monthly', createdAt: NOW.toISOString(), ...over };
}
function evt(contactId: string, daysFromNow: number, over: Partial<Event> = {}): Event {
  const d = new Date(NOW.getTime() + daysFromNow * 86400000).toISOString().slice(0, 10);
  return { id: `e-${contactId}-${daysFromNow}`, title: 'New job', date: d, type: 'milestone', userId: 'u', contactId, ...over };
}

describe('homeReasons', () => {
  it('window constant is 30', () => {
    expect(REASON_WINDOW_DAYS).toBe(30);
  });

  it('includes an upcoming birthday within the window', () => {
    const c = contact('maya', { birthday: '1990-06-24' }); // 4 days away
    const reasons = getContactReasons(c, [], NOW);
    expect(reasons.some(r => r.kind === 'birthday')).toBe(true);
  });

  it('excludes a birthday outside the window', () => {
    const c = contact('maya', { birthday: '1990-09-01' });
    expect(getContactReasons(c, [], NOW).some(r => r.kind === 'birthday')).toBe(false);
  });

  it('includes a linked event within the window and ignores other contacts events', () => {
    const c = contact('maya');
    const events = [evt('maya', 5), evt('someone-else', 2)];
    const reasons = getContactReasons(c, events, NOW);
    expect(reasons.filter(r => r.kind === 'event')).toHaveLength(1);
  });

  it('sorts reasons soonest-first', () => {
    const c = contact('maya', { birthday: '1990-07-15' }); // 25 days
    const reasons = getContactReasons(c, [evt('maya', 3)], NOW);
    expect(reasons[0].daysUntil).toBeLessThanOrEqual(reasons[1].daysUntil);
  });

  it('hasQualifyingReason is false with no birthday/events', () => {
    expect(hasQualifyingReason(contact('x'), [], NOW)).toBe(false);
  });

  it('getPeopleWithEvents excludes the hero and the non-qualifying', () => {
    const hero = contact('hero', { birthday: '1990-06-22' });
    const other = contact('other', { birthday: '1990-06-25' });
    const none = contact('none');
    const result = getPeopleWithEvents([hero, other, none], [], 'hero', NOW);
    expect(result.map(c => c.id)).toEqual(['other']);
  });
});
