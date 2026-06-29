// src/utils/notifications.ts
//
// Local (on-device) notifications for Link. No server, no remote push — every
// notification is scheduled on the device with fixed content and a fire time.
//
// Because local notification content can't be recomputed at delivery time, we
// keep names fresh two ways:
//   1. Short horizon — only the next few "reach out" windows are queued.
//   2. rescheduleNotifications() is called on every app foreground AND right
//      after the user marks someone contacted, so the queue always reflects
//      live data. We never pre-commit a frozen two-week snapshot.
//
// Anti-pushy rules baked in: off by default, only fires inside user-chosen
// windows, and stays silent when nobody is actually due.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Contact, DayOfWeek, NotificationSettings } from '../types';
import { loadContacts } from './contactsStorage';
import { loadNotificationSettings } from './notificationSettings';
import { scoreContactStable, isContactDue, fullName, getDaysUntilBirthday } from '../screens/home/homeUtils';

// How many upcoming nudge windows to pre-queue. Small on purpose — the app
// reschedules on every foreground, so a name can never go more than a couple
// days stale.
const NUDGE_HORIZON = 3;
// How far ahead to schedule birthday reminders. Birthdays are pure date math,
// so there's no staleness risk in queuing these further out.
const BIRTHDAY_HORIZON_DAYS = 30;
const BIRTHDAY_HOUR = 9; // morning-of

// Identifies notifications we own, so we never cancel something we didn't set.
const NUDGE_TAG = 'link-nudge';
const BIRTHDAY_TAG = 'link-birthday';

const DAY_INDEX: Record<DayOfWeek, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

let handlerConfigured = false;

// Show banners/sounds even when the app is foregrounded. Call once at startup.
export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Requests OS permission. Only called when the user opts in (never on launch).
export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (Platform.OS === 'android' && status === 'granted') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return status === 'granted';
}

export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// ── scheduling helpers ────────────────────────────────────────────────

// Next `count` datetimes matching the chosen weekdays at HH:MM, strictly future.
function nextWindowDates(days: DayOfWeek[], time: string, count: number): Date[] {
  if (days.length === 0) return [];
  const [hh, mm] = time.split(':').map(Number);
  const wanted = new Set(days.map(d => DAY_INDEX[d]));
  const out: Date[] = [];
  const cursor = new Date();
  // Scan up to two weeks of calendar days to collect `count` matches.
  for (let i = 0; i < 14 && out.length < count; i++) {
    const d = new Date();
    d.setDate(cursor.getDate() + i);
    d.setHours(hh, mm, 0, 0);
    if (wanted.has(d.getDay()) && d.getTime() > Date.now()) {
      out.push(d);
    }
  }
  return out;
}

// Due contacts, most overdue first.
function dueContactsByPriority(contacts: Contact[]): Contact[] {
  return contacts
    .filter(isContactDue)
    .sort((a, b) => scoreContactStable(b) - scoreContactStable(a));
}

async function scheduleNudges(settings: NotificationSettings, all: Contact[]): Promise<void> {
  const dates = nextWindowDates(settings.days, settings.time, NUDGE_HORIZON);
  if (dates.length === 0) return;

  const due = dueContactsByPriority(all);
  if (due.length === 0) return; // stay silent when nobody is due

  for (let i = 0; i < dates.length; i++) {
    // Spread distinct names across windows so consecutive nudges feel varied.
    const contact = due[i % due.length];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to reach out 👋',
        body: `${fullName(contact)} is near the top of your list`,
        data: { tag: NUDGE_TAG, contactId: contact.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dates[i],
      },
    });
  }
}

async function scheduleBirthdays(all: Contact[]): Promise<void> {
  for (const c of all) {
    if (!c.birthday) continue;
    const daysUntil = getDaysUntilBirthday(c.birthday);
    if (daysUntil === null || daysUntil > BIRTHDAY_HORIZON_DAYS) continue;

    const when = new Date();
    when.setDate(when.getDate() + daysUntil);
    when.setHours(BIRTHDAY_HOUR, 0, 0, 0);
    if (when.getTime() <= Date.now()) continue; // birthday's morning already passed today

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎂 Birthday today',
        body: `It's ${fullName(c)}'s birthday — a quick message would mean a lot`,
        data: { tag: BIRTHDAY_TAG, contactId: c.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
      },
    });
  }
}

// Cancels every notification Link previously scheduled, leaving anything we
// don't own untouched.
async function cancelOurNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(n => {
        const tag = (n.content.data as { tag?: string } | undefined)?.tag;
        return tag === NUDGE_TAG || tag === BIRTHDAY_TAG;
      })
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

// The one entry point. Rebuilds the whole queue from live settings + contacts.
// Safe to call often (foreground, after marking contacted, after settings edits).
export async function rescheduleNotifications(): Promise<void> {
  try {
    const settings = await loadNotificationSettings();
    await cancelOurNotifications();

    if (!settings.enabled) return;
    if (!(await hasNotificationPermission())) return;

    const contacts = await loadContacts();
    await scheduleNudges(settings, contacts);
    if (settings.birthdaysEnabled) await scheduleBirthdays(contacts);
  } catch {
    // Never let a scheduling hiccup crash the app.
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await cancelOurNotifications();
  } catch {
    // no-op
  }
}

// Fires a notification ~2s out so the user can confirm permissions/delivery.
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Link notifications are on ✓',
      body: "This is a test — you'll get gentle nudges in your chosen windows.",
      data: { tag: NUDGE_TAG },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
    },
  });
}
