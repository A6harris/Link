// src/utils/notificationSettings.ts
// Persistence for the local notification preferences. Kept separate from
// notifications.ts so the Settings screen can read/write without pulling in
// expo-notifications.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationSettings } from '../types';

const STORAGE_KEY = '@link_notifications';

// Off by default — nothing fires until the user explicitly opts in.
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  time: '17:00',
  birthdaysEnabled: true,
};

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    // Merge over defaults so older/partial saves stay valid.
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Setting stays in component state for this session if the write fails.
  }
}
