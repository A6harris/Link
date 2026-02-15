import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// Type-safe Database definitions live in ./database.types.ts for reference.
// We intentionally omit the generic parameter here because the current
// @supabase/supabase-js version requires auto-generated types for full
// type-safety.  Queries still work; they just return `any` row shapes.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'your_supabase_url';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
