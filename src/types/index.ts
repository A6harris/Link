// User and Profile Types
// src/types/index.ts

// ────────────────────────────────────────────────────────────
// User (matches Supabase `users` table from DATABASE.md)
// ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email?: string; // sourced from auth.users session, not stored in users table
  phone_number?: string | null;
  display_name: string;
  avatar_url?: string | null;
  birthday?: string | null;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
}

// ────────────────────────────────────────────────────────────
// Friendships (matches Supabase `friendships` table)
// ────────────────────────────────────────────────────────────

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  cadence: ContactFrequency;
  last_contacted_at?: string | null;
  context_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined relation (populated via Supabase joins)
  friend?: User;
}

/** @deprecated Use Friendship instead — kept temporarily for backward compatibility */
export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  contactFrequency: ContactFrequency;
  birthday?: string | null;
  lastContacted?: string;
  lastContactedCount?: string;
  createdAt: string;
  updatedAt: string;
  friend: User;
}

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
// Events and Milestones (matches Supabase `events` table)
// ────────────────────────────────────────────────────────────

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: EventType;
  userId: string;
  contactId?: string | null;
  friendId?: string | null;
  friendshipId?: string | null;
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
// Connection Suggestions
// ────────────────────────────────────────────────────────────

export interface ConnectionSuggestion {
  id: string;
  friendId: string;
  friend: User;
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
// API Response Types
// ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ────────────────────────────────────────────────────────────
// Navigation Types
// ────────────────────────────────────────────────────────────

import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
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
  Events: undefined;
  Settings: undefined;
};
