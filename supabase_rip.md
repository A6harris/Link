Supabase Removal — Session Summary
Project: c:\LINK_app\Link — React Native/Expo SDK 54 app. Ripping out Supabase entirely, running fully on-device with AsyncStorage. Personal use / TestFlight only.

What's been completed
Pass 1 (Audit) — complete. Full inventory confirmed:

Live Supabase imports: src/services/supabase/client.ts, auth.ts (consumed by friendsApi.ts, eventsApi.ts)
Commented-out stubs: connectionsApi.ts:3, authSlice.ts:5, RootNavigator.tsx:3 (to be deleted, not just uncommented)
MOCK_USER_ID = 'user-1' in 4 screens: CalendarScreen, AddFriendScreen, FriendProfileScreen, FriendsListScreen
Auth gate in RootNavigator reads state.auth.isAuthenticated / isInitializing; LoginScreen and SignUpScreen read state.auth.isLoading / error
useGetConnectionSuggestionsQuery is exported from connectionsApi.ts but never imported anywhere — confirmed dead code
pre_shipping_review.md exists at repo root; contains a stale claim that HomeScreen uses useGetConnectionSuggestionsQuery (it doesn't — HomeScreen uses loadContacts() directly)
Pass 2 — complete. Created src/utils/localUser.ts:

Exports LOCAL_USER_ID_KEY = '@link:localUserId'
Exports getOrCreateLocalUserId(): Promise<string> — reads key, creates local-${random}-${timestamp} if missing, persists and returns

Pass 3 — complete. Skipped auth, go straight to main:

Rewrote src/navigation/RootNavigator.tsx to 5 lines — just renders <MainNavigator />, no auth state checks
Deleted src/navigation/AuthNavigator.tsx
Deleted src/screens/auth/LoginScreen.tsx, src/screens/auth/SignUpScreen.tsx, and the src/screens/auth/ directory
Removed AuthStackParamList and the Auth: undefined entry from RootStackParamList in src/types/index.ts

Pass 4 — complete. Stripped auth from Redux:

Deleted src/store/slices/authSlice.ts

Pass 5 — complete. Stripped RTK Query APIs:

Deleted src/store/api/friendsApi.ts
Deleted src/store/api/connectionsApi.ts
Deleted src/store/slices/friendsSlice.ts
Deleted src/store/slices/connectionsSlice.ts
src/store/store.ts rewritten to 7 lines: bare configureStore({ reducer: {} }) with RootState and AppDispatch type exports (combined Passes 4/5/6 store changes into one edit)

Pass 6 — complete. Converted events to a local hook:

Created src/hooks/useEvents.ts — useState + useEffect over eventsStorage, exposes events, isLoading, refetch, createEvent, updateEvent, deleteEvent
Updated src/screens/calendar/CalendarScreen.tsx: removed all RTK Query hooks (useGetFriendsQuery, useGetEventsQuery, useCreateEventMutation, useDeleteEventMutation), removed MOCK_USER_ID, removed friends/friendNameLookup integration; birthday events now sourced from local contacts only; uses useEvents + getOrCreateLocalUserId pattern
Updated src/screens/friends/FriendProfileScreen.tsx: same userId pattern, useEvents replaces useGetEventsQuery + useCreateEventMutation, local isCreatingEvent state replaces RTK Query loading flag
Deleted src/store/api/eventsApi.ts

Pass 6.5 — complete. Comment cleanup:

Removed four Supabase-referencing comment lines from src/types/index.ts (section headers updated)
Removed two stale Supabase comment lines from src/screens/settings/SettingsScreen.tsx
Remaining Supabase references are confined to src/services/supabase/ (live code, Pass 8) and AddFriendScreen/FriendsListScreen (Pass 7)

Pass 7 — complete. Screen cleanup:

src/screens/friends/FriendsListScreen.tsx: removed useGetFriendsQuery import, MOCK_USER_ID constant, refetch() call from onRefresh, and the unreachable isLoading guard + its loadingContainer/loadingText styles. Screen renders entirely from local contacts.
src/screens/friends/AddFriendScreen.tsx: removed the entire "Find User" search mode — useSearchUsersQuery, useAddFriendMutation, User type import, mode/searchTerm state, handleAddFriend, renderUser, renderModeToggle, renderSearchMode, and ~350 lines of dead styles. Screen is now "Add Contact" — manual entry form only. Header subtitle is now static.
src/screens/home/HomeScreen.tsx: confirmed already fully local; no changes needed.

Pass 8 — complete. Removed Supabase service layer:

Deleted src/services/supabase/client.ts, src/services/supabase/auth.ts, src/services/supabase/database.types.ts
Deleted src/services/supabase/ directory (and src/services/ as it was then empty)

Pass 9 — complete. Updated package.json:

Removed @supabase/supabase-js from dependencies
Removed react-native-url-polyfill from dependencies (only consumer was Supabase client)
@reduxjs/toolkit and react-redux left in place; store is near-empty but Provider wiring untouched

Pass 10 — complete. Cleaned up types and env:

src/types/index.ts: removed User, Friendship, Friend, ApiResponse, PaginatedResponse (all tied to Supabase); removed AuthStackParamList (already deleted in Pass 3); removed friendId and friendshipId fields from Event interface; removed ConnectionSuggestion.friend field (HomeScreen uses its own local type)
.env.example: removed Supabase block entirely

Pass 11 — complete. Documentation:

Created docs/SUPABASE_REMOVAL.md — files deleted, files modified, dependencies removed, replacement architecture table, how-to-restore checklist, schema reference
Updated pre_shipping_review.md — added dated correction note at top flagging obsolete items and correcting the false claim that HomeScreen consumed useGetConnectionSuggestionsQuery
Removed stale Supabase comment block from App.tsx (5-line comment referencing RootNavigator's auth gate and onAuthStateChange)

Pass 12 — complete. Final verification:

Grep sweep across all src/**/*.{ts,tsx} and package.json for: supabase, SUPABASE, friendsApi, connectionsApi, eventsApi, MOCK_USER_ID, authSlice, Friendship, AuthStackParamList, useGetFriends, useGetEvents, useSearchUsers, useAddFriend, loginUser, registerUser, initializeAuth, createClient, react-native-url-polyfill
Result: zero matches in source files and package.json

Post-pass fix — CalendarScreen.tsx:

After Pass 10 removed friendId and friendshipId from the Event interface, CalendarScreen's birthdayEvents computation was still assigning both fields. Removed friendId: null and friendshipId: null from the pushBirthday object literal (lines 151–152).

All passes complete. Run npm install to sync node_modules.
Pass 3: Rewrite RootNavigator.tsx to always render <MainNavigator /> (≤20 lines, no auth state). Delete AuthNavigator.tsx, screens/auth/LoginScreen.tsx, screens/auth/SignUpScreen.tsx, and the src/screens/auth/ directory. Remove AuthStackParamList (and the stale Auth entry in RootStackParamList) from src/types/index.ts.

Pass 4: Delete src/store/slices/authSlice.ts. Remove authReducer import and registration from store.ts.

Pass 5: Delete friendsApi.ts, connectionsApi.ts, friendsSlice.ts, connectionsSlice.ts. Strip their reducers/middleware from store.ts. Fix the two screens that import from friendsApi: FriendsListScreen (remove useGetFriendsQuery, MOCK_USER_ID, refetch from onRefresh, simplify isLoading guard) and AddFriendScreen (remove useSearchUsersQuery, useAddFriendMutation, MOCK_USER_ID, handleAddFriend, the entire "Find User" search mode — keep only the manual entry form).

Pass 6: Create src/hooks/useEvents.ts (useState + useEffect over eventsStorage, exposing events, isLoading, refetch, createEvent, updateEvent, deleteEvent; hook injects userId into payloads). Update CalendarScreen and FriendProfileScreen to use the hook + getOrCreateLocalUserId() pattern; remove MOCK_USER_ID, all RTK Query event hooks, friends/friendNameLookup from CalendarScreen (birthdays from local contacts only). Delete eventsApi.ts. Strip eventsApi from store.ts (leaving it near-empty).

Pass 6.5: Scan remaining files for commented-out references to supabase, Supabase, AuthService, onAuthStateChange, createClient — delete those comment lines. Zero Supabase references (live or commented) should remain.

Docs: Write docs/SUPABASE_REMOVAL.md listing every file deleted, every file modified, and the restoration checklist.

Key files that still exist and will be deleted
src/services/supabase/ (whole directory), src/store/api/friendsApi.ts, connectionsApi.ts, eventsApi.ts, src/store/slices/authSlice.ts, friendsSlice.ts, connectionsSlice.ts, src/navigation/AuthNavigator.tsx, src/screens/auth/LoginScreen.tsx, src/screens/auth/SignUpScreen.tsx

Pass 1 (audit) is already complete. The audit confirmed the scope. Proceed directly to Pass 2.

Quick scope reminder from the audit:
- Live Supabase imports: src/services/supabase/client.ts, auth.ts; consumed by friendsApi, eventsApi
- Commented-out Supabase stubs: connectionsApi.ts, authSlice.ts, RootNavigator.tsx (delete these comment lines too, not just live imports)
- connectionsApi is fully dead — exported but never consumed
- MOCK_USER_ID lives in 4 screens: CalendarScreen, AddFriendScreen, FriendProfileScreen, FriendsListScreen
- pre_shipping_review.md exists in the repo and has a stale claim about HomeScreen using connectionsApi — needs a correction note

Don't run any commands. Make code changes in passes and stop after each pass for review.

When all passes are done, write `docs/SUPABASE_REMOVAL.md` documenting what was removed, what replaced it, and how to restore Supabase later.

## Pass 2: Local user ID utility

Create `src/utils/localUser.ts` exporting:
- `getOrCreateLocalUserId(): Promise<string>` — reads `@link:localUserId` from AsyncStorage, creates one if missing using `local-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`, persists it, returns it
- `LOCAL_USER_ID_KEY` constant

Replaces every `MOCK_USER_ID` and any `state.auth.user.id` reference.

## Pass 3: Skip auth, go straight to main

1. `src/navigation/RootNavigator.tsx`: rewrite to always render `<MainNavigator />`. Remove all auth state checks, the `AuthNavigator` import, the splash UI, and the commented-out Supabase imports near the top of the file. The whole file should end up under 20 lines.
2. Delete `src/navigation/AuthNavigator.tsx`
3. Delete `src/screens/auth/LoginScreen.tsx`, `src/screens/auth/SignUpScreen.tsx`, and the `src/screens/auth/` directory
4. Remove `AuthStackParamList` from `src/types/index.ts`

## Pass 4: Strip auth from Redux

1. Delete `src/store/slices/authSlice.ts` entirely (including the commented-out `import * as AuthService` line at the top — confirmed dead by audit)
2. `src/store/store.ts`: remove the auth reducer import and registration

## Pass 5: Strip RTK Query APIs

1. Delete `src/store/api/friendsApi.ts`
2. Delete `src/store/api/connectionsApi.ts` (audit confirms zero consumers — safe to remove without further checks)
3. Delete `src/store/slices/friendsSlice.ts` and `src/store/slices/connectionsSlice.ts`
4. `src/store/store.ts`: remove all three API reducers, all three middleware entries, and the friends/connections slice reducers
5. After this pass, `src/store/store.ts` should be a near-empty `configureStore` call. Keep the file and `Provider` wiring intact for now — note in the documentation pass that the store could be removed entirely later if no slices ever return.

## Pass 6: Convert events to a local hook

Create `src/hooks/useEvents.ts` exporting `useEvents(userId: string)` returning:
- `events: Event[]`
- `isLoading: boolean`
- `refetch: () => Promise<void>`
- `createEvent: (payload: Partial<Event>) => Promise<Event>`
- `updateEvent: (id: string, changes: Partial<Event>) => Promise<Event | null>`
- `deleteEvent: (id: string) => Promise<void>`

Implementation: `useState` for events + isLoading, `useEffect` to load via `loadEvents(userId)` on mount and when userId changes, mutations wrap the existing `addEvent` / `updateEvent` / `removeEvent` from `eventsStorage.ts` and update local state on success. No optimistic UI, no RTK Query, no network.

Then update screens:

1. `src/screens/calendar/CalendarScreen.tsx`:
   - Remove `useGetFriendsQuery`, `useGetEventsQuery`, `useCreateEventMutation`, `useDeleteEventMutation`
   - Remove `MOCK_USER_ID`
   - Add a `useState<string | null>(null)` for `userId`, populate via `getOrCreateLocalUserId()` in a `useEffect` on mount
   - Use the new `useEvents(userId)` hook (skip rendering events list while userId is null — show the existing loader)
   - Remove the `useGetFriendsQuery` integration entirely. Birthdays come only from local contacts now. Delete the `friendNameLookup` and `friends` references.

2. `src/screens/friends/FriendProfileScreen.tsx`:
   - Same userId-loading pattern
   - Replace `useGetEventsQuery` and `useCreateEventMutation` with `useEvents`
   - Remove `MOCK_USER_ID`

3. Delete `src/store/api/eventsApi.ts`
4. `src/store/store.ts`: remove the eventsApi reducer/middleware entries

## Pass 6.5: Comment cleanup

The audit found commented-out Supabase imports in three files. After the live deletions in earlier passes, scan the codebase for any remaining commented references to `supabase`, `Supabase`, `AuthService`, `onAuthStateChange`, or `createClient`. Delete those comment lines. The codebase should have zero references to Supabase after this pass — live or commented.

## Pass 7: Clean up screens with dead friends queries

1. `src/screens/friends/FriendsListScreen.tsx`:
   - Remove `useGetFriendsQuery` import and the call
   - Remove `MOCK_USER_ID`
   - The `friends` variable is unused in render — remove it
   - The screen renders entirely from local `contacts` already, so no logic changes

2. `src/screens/friends/AddFriendScreen.tsx`:
   - Remove `useSearchUsersQuery`, `useAddFriendMutation`, `MOCK_USER_ID`
   - Remove the entire "search for app users" mode: the `mode` state, the `searchTerm` state, `handleAddFriend`, `renderUser`, `renderSearchMode`, `renderModeToggle`, and the `Find User / Manual Entry` toggle UI
   - The screen becomes "Add Contact" with only the manual entry form
   - Update `headerTitle` and `headerSubtitle` to drop the conditional based on mode
   - Make sure all the styles for the removed UI (`modeToggle`, `modeButton`, `searchModeContainer`, `searchCard`, `searchContainer`, `userCard`, `instructionsContainer`, `emptyResults`, etc.) are deleted from the StyleSheet — don't leave dead style entries

3. `src/screens/home/HomeScreen.tsx`: audit confirms it's already fully local. Verify no Supabase or RTK Query imports remain — if any are there, remove them.

## Pass 8: Remove the Supabase service layer

Delete `src/services/supabase/client.ts`, `src/services/supabase/auth.ts`, `src/services/supabase/database.types.ts`, and the `src/services/supabase/` directory. Remove `src/services/` if empty.

## Pass 9: Update package.json

Remove from dependencies:
- `@supabase/supabase-js`
- `react-native-url-polyfill` (only consumer was the Supabase client)

Leave `@reduxjs/toolkit` and `react-redux` for now — flag in the documentation pass that they could be removed if the store stays empty.

## Pass 10: Update .env.example and types

1. `.env.example`: remove the Supabase block. Leave PostHog/Sentry as-is.

2. `src/types/index.ts` — audit and remove what's no longer referenced:
   - `User` interface — verify no remaining references after auth removal; if used only by Friend/Friendship, delete it
   - `Friendship` interface — delete (not used after removal)
   - `Friend` interface — delete (not used after removal)
   - `AuthStackParamList` — delete (Pass 3 removed the navigator)
   - `ApiResponse` and `PaginatedResponse` — verify unused, delete if so
   
   Keep: `Contact`, `ContactFrequency`, `Event`, `EventType`, `CallAvailability`, `DayOfWeek`, `ConnectionSuggestion`, `ConnectionReason`, `RootStackParamList`, `FriendsStackParamList`, `MainTabParamList`

## Pass 11: Documentation

Write `docs/SUPABASE_REMOVAL.md`. Keep it under 200 lines. Cover:

1. **Date and reason** — single-user personal app, TestFlight target, no remote sync needed
2. **Files deleted** — full list with one-line descriptions
3. **Files modified** — list with summary per file
4. **Dependencies removed** from package.json
5. **Replacement architecture**:
   - Contacts: AsyncStorage via `contactsStorage.ts` (unchanged)
   - Events: AsyncStorage via `eventsStorage.ts`, exposed through `useEvents` hook (new)
   - User identity: stable local ID via `localUser.ts` (new)
   - Auth: none — app opens directly to main tabs
6. **How to restore Supabase later** — checklist:
   - Reinstall `@supabase/supabase-js` and `react-native-url-polyfill`
   - Restore `src/services/supabase/` from git history (commit hash if you can find the last one before this PR)
   - Restore `authSlice`, Auth screens, and the `RootNavigator` gating from git
   - Reintroduce `friendsApi` and `eventsApi` as RTK Query layers — recommend keeping the local hooks as a fallback so the app works offline (the deleted `eventsApi` had this pattern, worth replicating)
   - Migrate local AsyncStorage data into Supabase tables on first sync. Local contact IDs are prefixed `local-` so they won't collide with Supabase UUIDs — use that prefix as the migration trigger.
7. **Schema reference** — copy the relevant table definitions from `docs/DATABASE.md` so they live next to this doc. Then add a one-line note at the top of `docs/DATABASE.md`: "This schema is not currently in use as of [date] — see SUPABASE_REMOVAL.md."

Also update `pre_shipping_review.md`:
- Add a note at the top dated today saying "Supabase has since been removed — see docs/SUPABASE_REMOVAL.md. Several items in this review are now obsolete."
- Specifically correct the stale claim about HomeScreen consuming `useGetConnectionSuggestionsQuery` — HomeScreen has always been fully local; that note was wrong even before removal.

## Pass 12: Final verification

Search the codebase for any remaining references to: `supabase`, `Supabase`, `SUPABASE`, `friendsApi`, `connectionsApi`, `eventsApi`, `MOCK_USER_ID`, `authSlice`, `Friendship`, `AuthStackParamList`, `useGetFriends`, `useGetEvents`, `useSearchUsers`, `useAddFriend`, `loginUser`, `registerUser`, `initializeAuth`, `createClient`, `react-native-url-polyfill`.

Anything that turns up is either dead code or something to flag. Print the results plus a short summary: total files deleted, total files modified, dependencies removed, and any places where you weren't sure whether to remove something.

Don't run `npm install`, don't run tests, don't try to build. I'll do those steps after reviewing.