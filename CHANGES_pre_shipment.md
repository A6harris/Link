# Pre-TestFlight Fix Log
Generated: 2026-05-19

## Context for reviewer

This is a React Native / Expo SDK 54 TypeScript app called **Link** — a personal relationship manager.
- **All data is stored locally on-device** via AsyncStorage. No servers, no accounts, no network calls.
- Target platform: iOS only (TestFlight → App Store).
- Bundle ID: `com.evanaden.linkapp`
- EAS build profile: `production` (archive)
- Entry point: `App.tsx` → React Navigation (bottom tabs + stack)

Key directories:
```
src/
├── screens/
│   ├── home/          — HomeScreen + sub-components (refactored)
│   ├── friends/       — FriendsListScreen, AddFriendScreen, FriendProfileScreen, SyncContactsScreen
│   └── settings/      — SettingsScreen
├── hooks/             — useEvents.ts
├── utils/             — contactsStorage.ts, localUser.ts, phoneContacts.ts, imageUtils.ts
└── components/        — ErrorBoundary.tsx, GradientButton, etc.
```

All fixes below were applied to `C:\LINK_app\Link`. The app is ready to build with `eas build --platform ios --profile production`.

---

## Blockers Fixed

### B1 — Bundle identifier was placeholder
**File:** `app.json`
- `"bundleIdentifier"` changed from `"com.PLACEHOLDER.link"` → `"com.evanaden.linkapp"`

---

### B2 — Privacy Policy & Terms of Service links were dead
**File:** `src/screens/settings/SettingsScreen.tsx`
- Added `Linking` import from `react-native`
- Both "Privacy Policy" and "Terms of Service" rows now call `Linking.openURL('https://a6harris.github.io/Link/privacy.html')`
- Privacy policy is live at that URL (GitHub Pages, `privacy.html` in repo root)

---

### B3 — expo-calendar declared but never used
**Files:** `package.json`, `app.json`
- Removed `"expo-calendar": "^15.0.7"` from `package.json`
- Removed `NSCalendarsUsageDescription` from `app.json` `infoPlist`

---

### B4 — expo-notifications installed, UI toggle non-functional
**Files:** `package.json`, `src/screens/settings/SettingsScreen.tsx`
- Removed `"expo-notifications": "^0.32.11"` from `package.json`
- Removed `notificationsEnabled` state and entire Notifications section from SettingsScreen
- Removed `Switch` from react-native imports

---

### B5 — expo-secure-store installed but never used
**File:** `package.json`
- Removed `"expo-secure-store": "^15.0.7"`
- Not needed: iOS Data Protection encrypts the app sandbox at OS level. expo-secure-store is for small credentials (Keychain), not large datasets.

---

### B6 — Crash: deprecated MediaTypeOptions.Images API
**File:** `src/screens/settings/SettingsScreen.tsx`
- `launchCameraAsync` and `launchImageLibraryAsync`: `mediaTypes: ImagePicker.MediaTypeOptions.Images` → `mediaTypes: ['images']`
- Camera permission denied: `setShowPhotoModal(false)` now called before Alert (was leaving modal open behind alert)

---

### B7 — Crash: useEvents hook unhandled promise rejections
**File:** `src/hooks/useEvents.ts`
- `load()` wrapped in `try/catch/finally`; `setIsLoading(false)` always called; `events` set to `[]` on error
- `load()` early-return when `!userId` now calls `setIsLoading(false)` first
- `createEvent`, `updateEvent`, `deleteEvent` each wrapped in `try/catch`; throw typed `Error`

---

### B8 — Crash: FriendProfileScreen save/delete unhandled promise rejections
**File:** `src/screens/friends/FriendProfileScreen.tsx`
- `onSave`: `updateContact` wrapped in `try/catch`; shows Alert on failure
- `onDelete`: `removeContact` wrapped in `try/catch`; shows Alert on failure

---

### B9 — Stuck spinner: SyncContactsScreen when contacts permission denied
**File:** `src/screens/friends/SyncContactsScreen.tsx`
- `setIsLoading(false)` added before Alert when `hasPermission` is false
- Previously `finally` was unreachable on this path, leaving spinner visible permanently

---

## High Priority Fixed

### H1 — Profile data lost on every app restart
**File:** `src/screens/settings/SettingsScreen.tsx`
- `useEffect` on mount loads `@link_profile` and `@link_availability` from AsyncStorage
- `handleSaveProfile`: now async, persists to `@link_profile`
- `handleSaveAvailability`: now async, persists to `@link_availability`

---

### H4 — getOrCreateLocalUserId: no error handling
**File:** `src/utils/localUser.ts`
- Wrapped in `try/catch`; returns session-only ID on storage failure so app stays functional
- Added `generateId()` export: uses `globalThis.crypto.randomUUID()` with `Math.random` fallback

---

### H5 — useEvents: isLoading stuck true when userId empty
Fixed as part of B7.

---

### H6 — Events never shown on FriendProfile
**File:** `src/screens/friends/FriendProfileScreen.tsx`
- `relatedEvents` memo was filtering `event.friendId` / `event.friendshipId` — neither field exists on `Event` type
- Fixed: now filters `event.contactId === contact.id`

---

### H7 — O(n²) bulk contact import
**Files:** `src/utils/contactsStorage.ts`, `src/screens/friends/SyncContactsScreen.tsx`
- Added `addContacts(contacts: Contact[])` batch function: 1 read + 1 write (was N reads + N writes)
- `handleImport` now uses single `.map(convertToAppContact)` + one `addContacts()` call

---

### H9 — Action buttons re-loaded all contacts from AsyncStorage on every tap
**File:** `src/screens/home/HomeScreen.tsx`
- All action handlers now use `allContacts.find(c => c.id === contactId)` (in-memory)
- `markContactedToday(contact)` in `homeUtils.ts` takes Contact directly — no `loadContacts()` inside

---

### H11 — No explanation before contacts permission dialog (Apple HIG violation)
**File:** `src/screens/friends/SyncContactsScreen.tsx`
- Removed auto-fire `useEffect(() => { loadPhoneContacts(); }, [])`
- Added `showPermissionPrompt` state (starts `true`)
- Explanation screen shown first with "Grant Access" / "Not Now" buttons
- Permission dialog only fires after user taps "Grant Access"

---

## Medium Priority Fixed

### M1 — Camera modal stays open behind permission-denied Alert
Fixed as part of B6.

### M2 — FriendsListScreen double-sorts contacts
**File:** `src/screens/friends/FriendsListScreen.tsx`
- Removed `sortByName` function
- `loadContactsFromStorage` now calls `setContacts(loaded)` directly (no re-sort)

### M3 — getFilteredContacts re-runs on every render
**Files:** `src/screens/friends/FriendsListScreen.tsx`, `src/screens/friends/SyncContactsScreen.tsx`
- Replaced plain `getFilteredContacts()` function + call with `useMemo([contacts/phoneContacts, searchQuery])`

### M4 — via.placeholder.com avatar fallback (external network call)
**File:** `src/screens/friends/FriendsListScreen.tsx`
- Avatar now conditionally renders `<Image>` if `profileImage` exists, otherwise `<LinearGradient>` with initials
- Added `avatarInitials` style to StyleSheet

### M5 — ErrorBoundary "Try Again" reuses stale component tree
**File:** `src/components/ErrorBoundary.tsx`
- State initializes `resetKey: 0`
- `handleReset` increments `resetKey` via functional setState
- Children wrapped in `<React.Fragment key={this.state.resetKey}>` to force full remount

### M6 — AddFriendScreen stores formatted phone string instead of digits
**File:** `src/screens/friends/AddFriendScreen.tsx`
- Phone stored as `phone.replace(/\D/g, '')` — digits only

### M7 — FriendProfileScreen image copy failure silent fallback
**File:** `src/screens/friends/FriendProfileScreen.tsx`
- Catch block now shows Alert instead of silently falling back to temp cache URI

### M8 — ID generation used Math.random()
**Files:** `src/utils/localUser.ts`, `src/utils/phoneContacts.ts`
- `generateId()` exported from `localUser.ts` using `globalThis.crypto.randomUUID()` with Math.random fallback
- Both ID strings in `phoneContacts.ts` (`fetchPhoneContacts` and `convertToAppContact`) now use `generateId()`

### M10 — Profile images stored at full resolution
**Files:** `src/utils/imageUtils.ts` (new), `FriendProfileScreen.tsx`, `AddFriendScreen.tsx`, `SettingsScreen.tsx`
- Installed `expo-image-manipulator`
- `resizeProfileImage(uri)`: resizes to 400×400 JPEG at 0.8 quality using `manipulateAsync`
- Called before FileSystem copy in FriendProfileScreen and AddFriendScreen; before setState in SettingsScreen

---

## HomeScreen Refactor

Original `HomeScreen.tsx` was ~1,157 lines. Split into 8 focused files:

```
src/screens/home/
├── HomeScreen.tsx               ~140 lines — state, handlers, layout
├── homeTypes.ts                 — ConnectionSuggestion, User, ConnectionReason, FrequencyKey types
├── homeUtils.ts                 — pure helpers + markContactedToday(contact: Contact)
├── useConnectionSuggestions.ts  — useLocalConnectionSuggestions hook
└── components/
    ├── HomeHeader.tsx            — greeting + date + notification button
    ├── FeaturedCardSection.tsx   — section title + shuffle button + FriendCard
    ├── AboutFriend.tsx           — last contacted / cadence / birthday / notes card
    ├── SuggestionDetailModal.tsx — bottom sheet modal with action buttons (inline gradient avatar fallback)
    └── HomeEmptyState.tsx        — "no friends yet" empty state
```

---

## User-made changes (audited and approved)

### phoneContacts.ts — contact pagination
- `fetchPhoneContacts` now paginates at PAGE_SIZE=200 using `pageSize`/`pageOffset`/`hasNextPage`
- Switched from `Fields.Image` → `Fields.Thumbnail` and `contact.image?.uri` → `contact.thumbnail?.uri`
- Approved: handles large contact lists without hanging; thumbnails load faster

### app.json — NSPrivacyCollectedDataTypes removed
- User had added `NSPrivacyCollectedDataTypes` entries for Name, Phone, Email, Photos, Contact Info
- **Removed**: this field declares data collected and sent off-device. For a local-only app it is incorrect and contradicts the privacy policy. `NSPrivacyAccessedAPITypes` (already present) is the correct and sufficient declaration.

---

## Packages Removed
| Package | Reason |
|---|---|
| `expo-calendar` | Never used |
| `expo-notifications` | UI toggle non-functional, feature unimplemented |
| `expo-secure-store` | Never imported; not needed for local-only storage |

## Packages Added
| Package | Reason |
|---|---|
| `expo-image-manipulator` | Resize profile images to 400×400 JPEG before storing |

---

## Privacy — Complete Status

| Item | Status |
|---|---|
| `NSPrivacyAccessedAPITypes` in privacy manifest | Done — FileTimestamp (C617.1) + UserDefaults (CA92.1) |
| `NSPrivacyCollectedDataTypes` | Correctly omitted — no data leaves device |
| `infoPlist` permission strings | Done — Contacts, Camera, PhotoLibrary, PhotoLibraryAdd |
| Privacy policy written & hosted | Done — `https://a6harris.github.io/Link/privacy.html` |
| Privacy policy URL in app | Done — both Settings rows |
| Privacy policy URL in App Store Connect | **TODO: enter manually when filling out listing** |
| App Store Connect nutrition label | **TODO: answer "No" to all data collection questions** |

---

## Config — Complete Status

| Item | Status |
|---|---|
| Bundle ID | `com.evanaden.linkapp` |
| `minimumOsVersion` | `"16.0"` |
| `buildNumber` | `"1"` |
| `appleId` in eas.json | `adenboone@gmail.com` |
| `ascAppId` in eas.json | `6771098760` |
| `appleTeamId` in eas.json | `453KK82Y4B` |
| App Store Connect listing | Created |
| Bundle ID registered in Apple Developer portal | Done |

---

## Post-Review Fixes (2026-05-19)

These two bugs were found during a second-pass audit of the pre-shipment changes above and have been applied to `SettingsScreen.tsx`.

### PR1 — Profile photo in Settings stored as temp cache URI (data loss on restart)

**File:** `src/screens/settings/SettingsScreen.tsx`

- **Bug:** `handleTakePhoto` and `handleChooseFromGallery` stored the URI returned by `resizeProfileImage()` (an `expo-image-manipulator` output written to the app's cache directory) directly in state and persisted that URI to AsyncStorage. iOS can evict cache files at any time, so the saved URI would point to a non-existent file after a restart, silently losing the profile photo.
- **Fix:** After resizing, both handlers now copy the image to `FileSystem.documentDirectory/profile_images/user_profile_<timestamp>.jpg` (persistent storage) and store the destination path — matching the pattern already used in `FriendProfileScreen` and `AddFriendScreen`.
- Added `import * as FileSystem from 'expo-file-system'` to the file's imports.

---

### PR2 — Gallery permission-denied left photo modal open behind Alert (incomplete B6 fix)

**File:** `src/screens/settings/SettingsScreen.tsx`

- **Bug:** The B6 fix added `setShowPhotoModal(false)` before the Alert in the camera permission-denied path, but the gallery (`handleChooseFromGallery`) permission-denied path was missed. The photo modal remained visible behind the Alert.
- **Fix:** Added `setShowPhotoModal(false)` before `Alert.alert(...)` in the gallery permission-denied branch, matching the camera path.

---

## Still To Do (manual, not code)

1. **App Store Connect nutrition label** — log in, go to your app listing → App Privacy → answer "No" to all data collection questions
2. **App Store Connect privacy policy URL** — paste `https://a6harris.github.io/Link/privacy.html` into the Privacy Policy URL field in the listing
3. **Trademark check** — search USPTO for "Link" before final public release
4. **Post-build** — after first `eas build`, run Xcode Privacy Report to verify `NSPrivacyAccessedAPITypeReasons` match actual binary usage

---

## Build command

```bash
eas build --platform ios --profile production
```

EAS handles certificates and provisioning automatically. Build takes ~10-15 minutes. Result appears in App Store Connect → TestFlight.
