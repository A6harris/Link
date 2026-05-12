# Pre-Shipping Code Review — Link App

> **Update 2026-05-07:** TestFlight preparation complete. See "Fixed During This Session" table below for all changes made on this date. The remaining blocker is replacing `com.PLACEHOLDER.link` in `app.json` with the real bundle identifier before running `eas build`.

> **Update 2026-05-05:** Supabase removed entirely — see [docs/SUPABASE_REMOVAL.md](docs/SUPABASE_REMOVAL.md). Auth screens, RTK Query APIs, authSlice, friendsSlice, connectionsSlice, eventsApi, and the Supabase service layer were all deleted. The app opens directly to main tabs with no auth gate. The claim below that "HomeScreen consumes `useGetConnectionSuggestionsQuery`" was incorrect even before removal.

Reviewed: 2026-05-03

---

## What This App Is

React Native + Expo SDK 54 app for maintaining relationships by surfacing who to contact next. Uses a weighted scoring algorithm based on cadence, recency, birthdays, and events. Fully local — no backend, no auth, all data in AsyncStorage.

---

## Architecture Notes (Non-Obvious)

- **All data is local**: contacts in `contactsStorage.ts`, events in `eventsStorage.ts`, both keyed to AsyncStorage. No network calls anywhere.
- **Local user identity**: `src/utils/localUser.ts` generates a stable `local-xxx-timestamp` ID on first launch. Screens call `getOrCreateLocalUserId()` in a `useEffect` and pass the result to `useEvents(userId)`.
- **Events hook**: `src/hooks/useEvents.ts` wraps `eventsStorage` with React state. Screens use this hook — don't call storage directly from screens.
- **Suggestion scoring lives in `HomeScreen.tsx`**: fully local, runs against AsyncStorage contacts. Scoring weights: weekly=80pts, monthly=60pts, quarterly=40pts, biannual=20pts, annually=10pts, plus overdue urgency boost and birthday bonuses.
- **Dismissed suggestions**: `src/store/slices/connectionsSlice.ts` tracks dismissed IDs in Redux (in-memory only, not persisted between launches).
- **No auth gate**: `RootNavigator` renders `<MainNavigator />` directly. App opens straight to tabs on every launch.

---

## Issues Found in Review

### Fixed During This Session

| Date | Issue | Resolution |
|------|-------|-----------|
| 2026-05-07 | `app.json` missing `ios.bundleIdentifier` | Added placeholder `com.PLACEHOLDER.link` — **must replace before `eas build`** |
| 2026-05-07 | `app.json` missing `ios.buildNumber` | Added `"buildNumber": "1"` |
| 2026-05-07 | `app.json` `supportsTablet: true` with phone-only layouts | Set to `false` |
| 2026-05-07 | No iOS Info.plist permission strings | Added `NSContactsUsageDescription`, `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`, `NSCalendarsUsageDescription` to `app.json` |
| 2026-05-07 | No Apple privacy manifest | Added `ios.privacyManifests` to `app.json` (file timestamps + UserDefaults) |
| 2026-05-07 | No `eas.json` | Created with `preview` (internal TestFlight) and `production` profiles |
| 2026-05-07 | `expo-router` in dependencies but app uses React Navigation | Removed from `package.json` |
| 2026-05-07 | Events tab showed a "coming soon" stub screen | Removed Events tab from `MainNavigator` and `MainTabParamList`; screen file retained |
| 2026-05-07 | `CLAUDE.md` described deleted Supabase architecture | Rewrote to reflect offline-first stack |
| 2026-05-03 | Auth thunks missing — login/signup screens dispatched non-existent actions | ~~Added local-mode thunks to `authSlice.ts`~~ *(auth removed entirely 2026-05-05)* |
| 2026-05-03 | No error boundary — any JS error crashed the app unrecoverably | Added `ErrorBoundary` in `src/components/ErrorBoundary.tsx`, wrapping `App.tsx` |
| 2026-05-03 | `logoutUser` had no AsyncStorage cleanup | ~~Fixed in `authSlice.ts`~~ *(auth removed entirely 2026-05-05)* |

---

### Still To Do

#### P0 — Blocking TestFlight build

**Replace bundle identifier**
- `app.json` currently has `"bundleIdentifier": "com.PLACEHOLDER.link"`
- Register a real identifier in App Store Connect (Certificates, Identifiers & Profiles), then update `app.json`
- Run `npm install` after removing `expo-router` to clean `node_modules`

---

#### P1 — Should fix before wide distribution

**`getOrCreateLocalUserId` race condition**
- If two components call it simultaneously on first launch, both read `null`, generate different IDs, and the second write wins — producing inconsistent event ownership
- Low risk in practice (screens mount sequentially) but worth hardening
- Fix: add a module-level promise cache so concurrent calls share the same in-flight `AsyncStorage.setItem`

**`useEvents` createEvent type safety**
- `src/hooks/useEvents.ts` casts the payload with `as Event` before passing to `addEvent` — missing required fields (`id`, `title`, `date`) silently produce malformed events
- Fix: require the caller to provide the minimal required shape, or validate inside the hook

**Accessibility**
- Interactive elements in `HomeScreen` and `FriendCard` lack `accessibilityLabel` and `accessibilityRole`
- Minimum: add `accessibilityLabel` to all `TouchableOpacity` elements that contain only icons

---

#### P2 — Quality improvements

**Split large screen files**
- `HomeScreen.tsx` (~1150 lines), `CalendarScreen.tsx` (~1100 lines), `SettingsScreen.tsx` (~1320 lines) each mix data orchestration, action handlers, and multiple render functions
- Highest-value extractions: event creation modal out of `CalendarScreen`, profile edit forms out of `SettingsScreen`, `FeaturedCard` + detail modal out of `HomeScreen`
- Action handlers (`performCall`, `performMessage`, FaceTime) are duplicated between card and modal in `HomeScreen` — extract to a shared hook

**Memoize suggestion recomputation**
- `useFocusEffect` in `HomeScreen` re-runs the full scoring algorithm (including `loadContacts` from AsyncStorage) on every screen focus
- Fine for small lists; will lag with 100+ contacts
- Fix: track a `lastModified` timestamp in AsyncStorage and only refetch when contacts have changed

**Expand test coverage**
- Only `__tests__/contactsStorage.test.ts` exists
- Highest-value additions: `useEvents` hook (mock AsyncStorage, test createEvent/updateEvent/deleteEvent), `HomeScreen` scoring logic (unit test the weighting functions), `localUser.ts` (verify ID persistence and the race-condition fix once implemented)

---

#### P3 — Lower priority

**No toast/snackbar system**
- User feedback is entirely `Alert.alert(...)` — blocking, modal, inconsistent between iOS and Android
- Recommendation: `react-native-toast-message`; swap `Alert.alert` for non-blocking toasts on success actions like "Contacted Recently"

**`connectionsSlice` dismissed suggestions are not persisted**
- Dismissed contacts come back after an app restart because the slice is in-memory only
- Fix: persist dismissed IDs to AsyncStorage (write on dismiss, load on app start)

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/screens/home/HomeScreen.tsx` | Suggestion scoring algorithm — all weighting logic lives here |
| `src/hooks/useEvents.ts` | Events read/write — wraps `eventsStorage` with React state |
| `src/utils/localUser.ts` | Stable local user ID — created once on first launch |
| `src/utils/contactsStorage.ts` | AsyncStorage CRUD for contacts |
| `src/utils/eventsStorage.ts` | AsyncStorage CRUD for events, keyed by userId |
| `src/store/slices/connectionsSlice.ts` | In-memory dismissed-suggestion IDs |
| `src/styles/theme.ts` | Single source for all design tokens — never hardcode values |
| `src/types/index.ts` | All shared types including nav params |
| `src/components/ErrorBoundary.tsx` | Root error boundary |
| `App.tsx` | Entry point — wraps with `ErrorBoundary` → `Provider` → `NavigationContainer` → `RootNavigator` |
| `app.json` | iOS bundle ID, build number, permissions, privacy manifest |
| `eas.json` | EAS Build profiles (`preview` for TestFlight, `production` for App Store) |
