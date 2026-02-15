// src/services/supabase/auth.ts
// Email + password authentication with Supabase.
// Phone number is collected in the UI and stored in public.users.

import { supabase } from './client';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import type { User } from '../../types';

// ────────────────────────────────────────────────────────────
// Uniqueness checks
// ────────────────────────────────────────────────────────────

/** Returns true if a public.users row already has this phone number. */
export async function checkPhoneExists(phone: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('phone_number', phone)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

/** Returns true if a public.users row already has this email. */
export async function checkEmailExists(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

// ────────────────────────────────────────────────────────────
// Sign Up — email + password, stores phone in public users row
// ────────────────────────────────────────────────────────────

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  phone: string,
) {
  // ── Pre-flight uniqueness checks ──
  const [phoneInUse, emailInUse] = await Promise.all([
    checkPhoneExists(phone),
    checkEmailExists(email),
  ]);
  if (phoneInUse) {
    throw new Error('A user with this phone number already exists.');
  }
  if (emailInUse) {
    throw new Error('A user with this email address already exists.');
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    // Supabase returns this message for duplicate emails
    if (authError.message?.toLowerCase().includes('already registered')) {
      throw new Error('A user with this email address already exists.');
    }
    throw authError;
  }
  if (!authData.user) throw new Error('Sign up succeeded but no user was returned.');

  // Insert a row in the public `users` table
  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    email,
    display_name: displayName,
    phone_number: phone,
  });

  if (profileError) {
    console.warn('Failed to create user profile row:', profileError.message);
  }

  return authData;
}

// ────────────────────────────────────────────────────────────
// Sign In — email + password
// ────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// ────────────────────────────────────────────────────────────
// Sign Out
// ────────────────────────────────────────────────────────────

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ────────────────────────────────────────────────────────────
// Session helpers
// ────────────────────────────────────────────────────────────

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return supabase.auth.onAuthStateChange(callback);
}

// ────────────────────────────────────────────────────────────
// User profile helpers
// ────────────────────────────────────────────────────────────

export async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return {
    id: data.id,
    email: data.email,
    display_name: data.display_name ?? '',
    phone_number: data.phone_number,
    avatar_url: data.avatar_url,
    birthday: data.birthday,
    timezone: data.timezone,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}
