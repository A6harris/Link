# Pre-TestFlight Fix Log
Generated: 2026-05-19

All changes made during the pre-submission review session. Covers all Blocker fixes, most High priority fixes, and the HomeScreen refactor.

---

## Blockers Fixed

### B1 — Bundle identifier
**File:** `app.json`
- Changed `"bundleIdentifier"` from `"com.PLACEHOLDER.link"` to `"com.evanaden.linkapp"`

---

### B2 — Privacy Policy & Terms of Service links
**File:** `src/screens/settings/SettingsScreen.tsx`
- Added `Linking` import from `react-native`
- Added `AsyncStorage` import from `@react-native-async-storage/async-storage`
- Both "Privacy Policy" and "Terms of Service" rows now call `Linking.openURL(...)` on press
- **Action needed:** Replace `'https://your-privacy-policy-url.com'` with your real hosted URL

---

### B3 — expo-calendar declared but never used
**Files:** `package.json`, `app.json`
- Removed `"expo-calendar": "^15.0.7"` from `package.json`
- Removed `NSCalendarsUsageDescription` from `app.json` `infoPlist`
- Ran `npm install` to sync `node_modules`

---

### B4 — expo-notifications installed with non-functional UI toggle
**Files:** `package.json`, `src/screens/settings/SettingsScreen.tsx`
- Removed `"expo-notifications": "^0.32.11"` from `package.json`
- Removed `notificationsEnabled` state
- Removed the entire Notifications settings section (Push Notifications toggle + Reminder Time row)
- Removed `Switch` from react-native imports (now unused)
- Ran `npm install` to sync `node_modules`

---

### B5 — expo-secure-store installed but never used
**File:** `package.json`
- Removed `"expo-secure-store": "^15.0.7"` from `package.json`
- **Note:** Encryption of local AsyncStorage data is not required for a local-only app. iOS Data Protection encrypts the app sandbox at the OS level when the device is locked. expo-secure-store (the Keychain) is designed for small credentials, not large datasets.
- Ran `npm install` to sync `node_modules`

---

### B6 — Crash: deprecated `MediaTypeOptions.Images` API removed in expo-image-picker v17
**File:** `src/screens/settings/SettingsScreen.tsx`
- `launchCameraAsync`: changed `mediaTypes: ImagePicker.MediaTypeOptions.Images` → `mediaTypes: ['images']`
- `launchImageLibraryAsync`: same change
- Also fixed: camera permission denied now calls `setShowPhotoModal(false)` before showing the Alert so the modal doesn't stay open behind it (M1)

---

### B7 — Crash: useEvents hook — unhandled promise rejections
**File:** `src/hooks/useEvents.ts`
- `load()`: wrapped in `try/catch/finally`; `setIsLoading(false)` now always called; `events` set to `[]` on error
- `load()` early return when `!userId`: now calls `setIsLoading(false)` before returning (also fixes H5)
- `createEvent`, `updateEvent`, `deleteEvent`: each wrapped in `try/catch`; throw a typed `Error` so callers can display an Alert

---

### B8 — Crash: FriendProfileScreen save/delete — unhandled promise rejections
**File:** `src/screens/friends/FriendProfileScreen.tsx`
- `onSave`: `updateContact` call wrapped in `try/catch`; shows "Failed to save contact. Please try again." Alert on error
- `onDelete` inner async handler: `removeContact` call wrapped in `try/catch`; shows "Failed to delete contact. Please try again." Alert on error

---

### B9 — Stuck spinner: SyncContactsScreen when contacts permission denied
**File:** `src/screens/friends/SyncContactsScreen.tsx`
- Added `setIsLoading(false)` immediately before the Alert when `hasPermission` is false
- Previously the `finally` block was unreachable on this path, leaving `isLoading` permanently `true`

---

## High Priority Fixed

### H1 — Profile data lost on every app restart
**File:** `src/screens/settings/SettingsScreen.tsx`
- Added `useEffect` that loads `@link_profile` and `@link_availability` from AsyncStorage on mount
- `handleSaveProfile`: now `async`; saves profile data (excluding `callAvailability`) to `@link_profile` in AsyncStorage
- `handleSaveAvailability`: now `async`; saves availability to `@link_availability` in AsyncStorage
- Both save silently on failure (data remains in state for the current session)

---

### H4 — getOrCreateLocalUserId: no error handling
**File:** `src/utils/localUser.ts`
- Wrapped both `AsyncStorage.getItem` and `AsyncStorage.setItem` calls in `try/catch`
- On failure, returns a session-only generated ID so screens that depend on `userId` don't hang permanently

---

### H5 — useEvents: isLoading stays true when userId is empty string
**File:** `src/hooks/useEvents.ts`
- Fixed as part of B7: the `if (!userId)` early return now calls `setIsLoading(false)` first

---

### H6 — Events never shown on FriendProfile via friendId navigation path
**File:** `src/screens/friends/FriendProfileScreen.tsx`
- `relatedEvents` memo was filtering by `event.friendId` and `event.friendshipId` — neither field exists on the `Event` type, so the filter always returned `[]`
- Fixed: now filters by `event.contactId === contact.id`; the contact is always resolved from either `contactId` or `friendId` params in the load `useEffect`, so `contact.id` is always correct

---

### H7 — O(n²) bulk contact import
**Files:** `src/utils/contactsStorage.ts`, `src/screens/friends/SyncContactsScreen.tsx`
- Added `addContacts(contacts: Contact[])` batch function to `contactsStorage.ts`: does one `loadContacts()` read, appends all new contacts, one `saveContacts()` write
- `handleImport` in `SyncContactsScreen`: replaced the `for...await addContact()` loop with a single `.map(convertToAppContact)` pass + one `addContacts()` call
- Import cost reduced from O(n) reads + O(n) writes to 1 read + 1 write

---

### H9 — Action buttons re-load all contacts from AsyncStorage on every tap
**File:** `src/screens/home/HomeScreen.tsx` (see HomeScreen Refactor below)
- `markContactAsContactedToday` (old) called `loadContacts()` internally — replaced with `markContactedToday(contact)` in `homeUtils.ts` which takes the `Contact` directly
- `performCall`, `performMessage`, `performFaceTime`, `performMarkContacted` all use `allContacts.find(c => c.id === contactId)` (in-memory lookup) instead of calling `loadContacts()` on each tap
- `allContacts` is already loaded and kept current by the `useLocalConnectionSuggestions` hook

---

### H11 — No explanation before contacts permission dialog
**File:** `src/screens/friends/SyncContactsScreen.tsx`
- Removed auto-fire `useEffect(() => { loadPhoneContacts(); }, [])`
- Added `showPermissionPrompt` state (starts `true`)
- New explanation screen shown first: explains what contacts are used for and that data stays on-device
- "Grant Access" button sets `showPermissionPrompt = false` and then calls `loadPhoneContacts()`
- "Not Now" button navigates back without requesting permission

---

## HomeScreen Refactor

The original `HomeScreen.tsx` was ~1,157 lines mixing types, constants, utilities, a custom hook, render helpers, action handlers, and styles. Split into 8 focused files:

```
src/screens/home/
├── HomeScreen.tsx               ~140 lines — state, handlers, layout
├── homeTypes.ts                 ~30 lines  — ConnectionSuggestion, User, ConnectionReason types
├── homeUtils.ts                 ~80 lines  — pure helpers + markContactedToday
├── useConnectionSuggestions.ts  ~80 lines  — useLocalConnectionSuggestions hook
└── components/
    ├── HomeHeader.tsx            ~45 lines  — greeting + date + notification button
    ├── FeaturedCardSection.tsx   ~65 lines  — section title + shuffle button + FriendCard
    ├── AboutFriend.tsx           ~95 lines  — last contacted / cadence / birthday / notes card
    ├── SuggestionDetailModal.tsx ~110 lines — bottom sheet modal with action buttons
    └── HomeEmptyState.tsx        ~45 lines  — "no friends yet" empty state
```

**Bonus fix in SuggestionDetailModal:** Profile image fallback is now an inline gradient icon instead of a `via.placeholder.com` network request (partial M4 fix).

---

## Packages Removed

| Package | Reason |
|---|---|
| `expo-calendar` | Declared in app.json but API never called in source |
| `expo-notifications` | Installed but UI toggle was non-functional; feature unimplemented |
| `expo-secure-store` | Installed but never imported; not needed for local-only storage |

---

## Still To Do (from original review)

### Remaining High
- **H10** — App name "Link" is a placeholder; run trademark search before final submission

### Medium Fixed
- **M2** — `FriendsListScreen`: removed redundant `sortByName` function; `loadContactsFromStorage` now calls `setContacts(loaded)` directly (no re-sort)
- **M3** — `getFilteredContacts()` replaced with `useMemo` in both `FriendsListScreen` and `SyncContactsScreen`; added `useMemo` to `SyncContactsScreen` import
- **M4** — `FriendsListScreen` avatar: replaced `via.placeholder.com` fallback with inline `LinearGradient` initials tile; added `avatarInitials` style
- **M5** — `ErrorBoundary`: state now initializes `resetKey: 0`; `handleReset` increments `resetKey`; children wrapped in `<React.Fragment key={resetKey}>` to force full remount on retry
- **M6** — `AddFriendScreen`: phone number stored as digits only (`phone.replace(/\D/g, '')`)
- **M7** — `FriendProfileScreen`: image copy failure catch block now shows an Alert instead of silently falling back to the temp cache URI
- **M8** — `phoneContacts.ts`: imported `generateId` from `./localUser`; replaced both `Math.random().toString(36)` ID strings (`fetchPhoneContacts` and `convertToAppContact`) with `generateId()`; `localUser.ts`: added exported `generateId()` using `globalThis.crypto.randomUUID()` with Math.random fallback
- **M10** — Installed `expo-image-manipulator`; created `src/utils/imageUtils.ts` with `resizeProfileImage(uri)` helper (resize to 400×400, JPEG, 0.8 quality); wired into `FriendProfileScreen`, `AddFriendScreen`, and `SettingsScreen` — resize happens before the FileSystem copy so the stored file is always compact

### Admin (before App Store submission, not code changes)
- Replace `'https://your-privacy-policy-url.com'` placeholder in `SettingsScreen.tsx` with real URL
- Enter privacy policy URL in App Store Connect
- Fill out App Store Connect privacy nutrition label (local-only app: answer "No" to data collection for most categories)
- Add `ios.minimumOsVersion: "16.0"` to `app.json`
- Finalize app name (confirm no trademark conflicts with "Link")
- Add `ascAppId` and `appleTeamId` to `eas.json` submit config
- After first build: run Xcode Privacy Report to verify `NSPrivacyAccessedAPITypeReasons` match binary usage
