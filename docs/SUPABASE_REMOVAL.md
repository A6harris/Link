# Supabase Removal

**Date:** 2026-05-05  
**Reason:** Single-user personal app targeting TestFlight only. No remote sync needed; full on-device operation simplifies the build and eliminates authentication friction.

---

## Files Deleted

| File | Description |
|------|-------------|
| `src/services/supabase/client.ts` | Supabase JS client initialisation |
| `src/services/supabase/auth.ts` | Auth helper wrappers |
| `src/services/supabase/database.types.ts` | Generated Supabase table types |
| `src/services/supabase/` | Entire directory removed |
| `src/store/slices/authSlice.ts` | Redux auth state + Supabase auth thunks |
| `src/store/slices/friendsSlice.ts` | Redux friends state |
| `src/store/slices/connectionsSlice.ts` | Redux dismissed-suggestions state *(re-added 2026-05-05 — see Files Modified)* |
| `src/store/api/friendsApi.ts` | RTK Query friends endpoints (Supabase-backed) |
| `src/store/api/eventsApi.ts` | RTK Query events endpoints (Supabase-backed with AsyncStorage fallback) |
| `src/store/api/connectionsApi.ts` | RTK Query connection suggestions (was fully dead — never consumed) |
| `src/navigation/AuthNavigator.tsx` | Stack navigator for Login/SignUp screens |
| `src/screens/auth/LoginScreen.tsx` | Login screen |
| `src/screens/auth/SignUpScreen.tsx` | Sign-up screen |

---

## Files Modified

| File | Changes |
|------|---------|
| `src/navigation/RootNavigator.tsx` | Rewritten to 5 lines — always renders `<MainNavigator />`, no auth gate |
| `src/store/store.ts` | Stripped to bare `configureStore({ reducer: {} })` with type exports only; later updated to register `connectionsReducer` (fixes Redux empty-reducer crash) |
| `src/hooks/useEvents.ts` | Created — `useState` + `useEffect` hook over `eventsStorage`, replaces RTK Query event hooks |
| `src/utils/localUser.ts` | Created — `getOrCreateLocalUserId()` for stable on-device user identity |
| `src/screens/calendar/CalendarScreen.tsx` | Removed RTK Query hooks and `MOCK_USER_ID`; uses `useEvents` + `getOrCreateLocalUserId` |
| `src/screens/friends/FriendProfileScreen.tsx` | Same as CalendarScreen |
| `src/screens/friends/FriendsListScreen.tsx` | Removed `useGetFriendsQuery` and `MOCK_USER_ID`; renders from local contacts only |
| `src/screens/friends/AddFriendScreen.tsx` | Removed search-for-app-users mode entirely; manual entry form only |
| `src/screens/settings/SettingsScreen.tsx` | Removed stale Supabase comment lines |
| `src/types/index.ts` | Removed `User`, `Friendship`, `Friend`, `ApiResponse`, `PaginatedResponse` (all Supabase-tied); removed `AuthStackParamList`; trimmed `Event` fields |
| `package.json` | Removed `@supabase/supabase-js` and `react-native-url-polyfill` |
| `.env.example` | Removed Supabase block |

---

## Dependencies Removed

- `@supabase/supabase-js` — Supabase client SDK
- `react-native-url-polyfill` — only consumer was the Supabase client

`@reduxjs/toolkit` and `react-redux` are still present. `connectionsSlice` was re-added to fix a Redux crash (`combineReducers` throws on an empty reducer object); the store now registers `connections: connectionsReducer`. No screen reads from it yet — dismissed suggestions are not persisted across sessions until HomeScreen is wired up.

---

## Replacement Architecture

| Concern | Before | After |
|---------|--------|-------|
| Contacts | AsyncStorage via `contactsStorage.ts` | Unchanged |
| Events | RTK Query → Supabase (AsyncStorage fallback) | AsyncStorage via `eventsStorage.ts`, exposed through `useEvents` hook |
| User identity | `state.auth.user.id` / `MOCK_USER_ID = 'user-1'` | Stable local ID via `localUser.ts` (`local-<random>-<timestamp>`) |
| Auth | Supabase Auth + Redux auth slice | None — app opens directly to main tabs |
| Friends | RTK Query → Supabase `friendships` table | Removed; all contacts are local only |
| Suggestions | RTK Query `connectionsApi` | `useLocalConnectionSuggestions` hook in `HomeScreen.tsx` (was already the live path) |

---

## How to Restore Supabase

1. **Reinstall packages:**
   ```
   npm install @supabase/supabase-js react-native-url-polyfill
   ```

2. **Restore service layer** from git history:
   ```
   git show <last-commit-before-removal>:src/services/supabase/client.ts > src/services/supabase/client.ts
   # repeat for auth.ts, database.types.ts
   ```

3. **Restore auth:**
   - Restore `authSlice.ts` from git
   - Restore `AuthNavigator.tsx`, `LoginScreen.tsx`, `SignUpScreen.tsx`
   - Restore auth gate in `RootNavigator.tsx`

4. **Restore server-state APIs:**
   - Restore `friendsApi.ts` and `eventsApi.ts` from git
   - Re-register them in `store.ts`
   - Recommend keeping `useEvents` as the local fallback — the deleted `eventsApi` had an AsyncStorage fallback pattern worth replicating

5. **Migrate local data on first sync:**
   - Local contact IDs are prefixed `local-` so they won't collide with Supabase UUIDs
   - Use that prefix as the migration trigger on first authenticated launch

6. **Restore `.env.example`** with Supabase vars:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

---

## Schema Reference

The Supabase schema is not currently in use. Key tables at the time of removal:

```sql
-- Users
create table public.users (
  id uuid primary key references auth.users(id),
  display_name text not null,
  phone_number text,
  avatar_url text,
  birthday date,
  timezone text default 'UTC',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Friendships
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  friend_id uuid references public.users(id),
  status text check (status in ('pending','accepted','blocked')),
  cadence text,
  last_contacted_at timestamptz,
  context_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  contact_id text,
  title text not null,
  description text,
  date date not null,
  type text,
  is_recurring boolean default false,
  reminder_enabled boolean default false,
  created_at timestamptz default now()
);
```
