import type { ContactFrequency } from '../../types';

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
