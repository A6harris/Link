// src/types/index.ts

// ────────────────────────────────────────────────────────────
// Local Contacts (stored on-device via AsyncStorage)
// ────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  profileImage?: string; // local uri or remote url
  contactFrequency: ContactFrequency;
  birthday?: string | null;
  lastContacted?: string | null; // ISO date string
  lastContactedCount?: string | null;
  notes?: string | null;
  createdAt: string;
}

export type ContactFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannual' | 'annually';

// ────────────────────────────────────────────────────────────
// Events and Milestones
// ────────────────────────────────────────────────────────────

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: EventType;
  userId: string;
  contactId?: string | null;
  isRecurring?: boolean;
  reminderEnabled?: boolean;
}

export type EventType = 'birthday' | 'anniversary' | 'achievement' | 'milestone' | 'holiday' | 'custom';

// ────────────────────────────────────────────────────────────
// Call Availability (local profile settings)
// ────────────────────────────────────────────────────────────

export interface CallAvailability {
  startTime: string; // Format: "HH:MM" (24-hour)
  endTime: string;   // Format: "HH:MM" (24-hour)
  daysAvailable: DayOfWeek[];
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// ────────────────────────────────────────────────────────────
// Notifications (local, on-device — see src/utils/notifications.ts)
// ────────────────────────────────────────────────────────────

export interface NotificationSettings {
  enabled: boolean;        // master switch; off by default, requested only on opt-in
  days: DayOfWeek[];       // which days a "reach out" nudge may fire
  time: string;            // "HH:MM" (24-hour) — when the nudge fires on those days
  birthdaysEnabled: boolean; // morning-of birthday reminders
}

// ────────────────────────────────────────────────────────────
// Connection Suggestions
// ────────────────────────────────────────────────────────────

export interface ConnectionSuggestion {
  id: string;
  friendId: string;
  score: number;
  reasons: ConnectionReason[];
  suggestedAt: string;
  dismissed?: boolean;
}

export interface ConnectionReason {
  type: 'upcoming_event' | 'last_contacted' | 'life_change' | 'cadence_priority' | 'random';
  description: string;
  weight: number;
}

// ────────────────────────────────────────────────────────────
// Navigation Types
// ────────────────────────────────────────────────────────────

import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Main: undefined;
};

export type FriendsStackParamList = {
  FriendsList: undefined;
  AddFriend: undefined;
  FriendProfile: { friendId: string; contactId?: never } | { contactId: string; friendId?: never };
  SyncContacts: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Friends: NavigatorScreenParams<FriendsStackParamList>;
  Settings: undefined;
};
