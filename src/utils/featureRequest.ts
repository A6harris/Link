// src/utils/featureRequest.ts
// Submits user feature requests / ideas to a Google Apps Script Web App, which
// appends a row to a Google Sheet and emails the team. The app stays fully
// offline by default — this is the one deliberate outbound call, and it only
// fires when the user taps "Send" in the Feature Request form.
//
// Set the endpoint via EXPO_PUBLIC_FEATURE_REQUEST_URL (see .env.example and
// docs/feature-request-apps-script.md for the script to deploy).
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getOrCreateLocalUserId } from './localUser';

const ENDPOINT = process.env.EXPO_PUBLIC_FEATURE_REQUEST_URL ?? '';

export type FeatureRequestInput = {
  /** The idea / feature request body. Required. */
  message: string;
  /** Optional name so we know who to thank / follow up with. */
  name?: string;
  /** Optional email so we can reply. */
  email?: string;
};

export type FeatureRequestResult =
  | { ok: true }
  | { ok: false; reason: 'not-configured' | 'empty' | 'network' };

/** True when an endpoint is configured, so the UI can hide/disable the feature. */
export function isFeatureRequestConfigured(): boolean {
  return ENDPOINT.length > 0;
}

export async function submitFeatureRequest(
  input: FeatureRequestInput,
): Promise<FeatureRequestResult> {
  const message = input.message.trim();
  if (!message) return { ok: false, reason: 'empty' };
  if (!ENDPOINT) return { ok: false, reason: 'not-configured' };

  // Best-effort metadata — never block the submission if any of it fails.
  let userId = 'unknown';
  try {
    userId = await getOrCreateLocalUserId();
  } catch {
    // keep default
  }

  const payload = {
    message,
    name: input.name?.trim() || '',
    email: input.email?.trim() || '',
    userId,
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    submittedAt: new Date().toISOString(),
  };

  try {
    // Apps Script Web Apps 302-redirect to a script.googleusercontent.com URL;
    // fetch follows it automatically. We send text/plain to avoid a CORS
    // preflight (Apps Script doesn't answer OPTIONS), and parse JSON in doPost.
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, reason: 'network' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
