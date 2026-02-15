// Auto-aligned with docs/DATABASE.md schema
// src/services/supabase/database.types.ts

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          phone_number: string | null;
          display_name: string | null;
          avatar_url: string | null;
          birthday: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string; // references auth.users(id), required on insert
          email?: string | null;
          phone_number?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          birthday?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string | null;
          phone_number?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          birthday?: string | null;
          timezone?: string;
          updated_at?: string;
        };
      };

      local_contacts: {
        Row: {
          id: string;
          user_id: string;
          phone_number: string | null;
          display_name: string | null;
          avatar_url: string | null;
          birthday: string | null;
          notes: string | null;
          context_notes: string | null;
          cadence: string;
          last_contacted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          phone_number?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          birthday?: string | null;
          notes?: string | null;
          context_notes?: string | null;
          cadence?: string;
          last_contacted_at?: string | null;
          created_at?: string;
        };
        Update: {
          phone_number?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          birthday?: string | null;
          notes?: string | null;
          context_notes?: string | null;
          cadence?: string;
          last_contacted_at?: string | null;
        };
      };

      friendships: {
        Row: {
          id: string;
          user_id: string;
          friend_id: string;
          status: 'pending' | 'accepted' | 'blocked';
          cadence: string;
          last_contacted_at: string | null;
          context_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          friend_id: string;
          status?: 'pending' | 'accepted' | 'blocked';
          cadence?: string;
          last_contacted_at?: string | null;
          context_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'pending' | 'accepted' | 'blocked';
          cadence?: string;
          last_contacted_at?: string | null;
          context_notes?: string | null;
          updated_at?: string;
        };
      };

      events: {
        Row: {
          id: string;
          user_id: string;
          friend_id: string | null;
          friend_type: 'app_user' | 'local_contact' | null;
          title: string;
          event_type: 'birthday' | 'anniversary' | 'milestone' | 'custom';
          event_date: string;
          is_recurring: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          friend_id?: string | null;
          friend_type?: 'app_user' | 'local_contact' | null;
          title: string;
          event_type: 'birthday' | 'anniversary' | 'milestone' | 'custom';
          event_date: string;
          is_recurring?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          friend_id?: string | null;
          friend_type?: 'app_user' | 'local_contact' | null;
          title?: string;
          event_type?: 'birthday' | 'anniversary' | 'milestone' | 'custom';
          event_date?: string;
          is_recurring?: boolean;
          notes?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
