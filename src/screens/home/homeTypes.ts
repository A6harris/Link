import type { Contact, ContactFrequency } from '../../types';

export type FrequencyKey = ContactFrequency;

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImage?: string;
};

export type ConnectionReason = {
  type?: 'upcoming_event' | 'last_contact' | 'cadence';
  description: string;
};

export type ConnectionSuggestion = {
  id: string;
  friendId: string;
  friend: User;
  score: number;
  reasons: ConnectionReason[];
  suggestedAt: string;
  dismissed?: boolean;
  meta?: {
    lastContactedISO?: string | null;
    frequency?: FrequencyKey;
    birthday?: string | null;
    notes?: string | null;
  };
};

// Weekly connection load: how many contacts are due this week and how many
// have already been reached. Derived from contacts; see weeklyGoal.ts.
export type WeeklyGoal = {
  goal: number;
  done: number;
  remaining: number;
};

// Snapshot taken before marking someone contacted, so the action can be undone.
export type UndoState = {
  message: string;
  contact: Contact;
  suggestion?: ConnectionSuggestion;
};
