# Link App — Pre-TestFlight Submission Review
Generated: 2026-05-19

---

## BLOCKERS — Fix before any TestFlight build

These will cause binary rejection, App Store review rejection, or a crash during Apple's review.

---

### B1. Bundle identifier is a placeholder
**File:** `app.json:16`
Replace `"com.PLACEHOLDER.link"` with a real reverse-DNS identifier you own (e.g. `com.yourname.linkapp`). Register the corresponding App ID in your Apple Developer account first. EAS Build will fail to generate a valid provisioning profile until this is done.

---

### B2. Privacy Policy link does nothing
**File:** `src/screens/settings/SettingsScreen.tsx:454-463`
The "Privacy Policy" and "Terms of Service" rows have no `onPress`. Tapping them does nothing. Apple requires a working privacy policy link inside any app that accesses contacts, camera, or photos (Guideline 5.1.1). Host a real privacy policy and wire these items to open it via `Linking.openURL(...)`. The URL must also be entered in App Store Connect under your app listing.

---

### B3. `expo-calendar` permission declared but never used
**Files:** `app.json:24`, `package.json:22`
`NSCalendarsUsageDescription` is in `infoPlist` and `expo-calendar` is in dependencies, but no source file ever imports or calls any `Calendar.*` API. The in-app CalendarScreen uses only local AsyncStorage. Apple will reject apps that request permissions they never actually use. Remove `expo-calendar` from `package.json` and remove `NSCalendarsUsageDescription` from `app.json`.

---

### B4. `expo-notifications` linked but completely unimplemented — UI toggle is fake
**Files:** `package.json:30`, `src/screens/settings/SettingsScreen.tsx:149,422-428`
The Settings screen shows a "Push Notifications" toggle that only flips local React state — no permission is ever requested, no token registered, no notification scheduled. `expo-notifications` is installed so it will be linked into the binary. Apple reviewers test toggle controls; a non-functional one is flagged as incomplete (Guideline 4.0). Either implement notifications properly or remove the package and the toggle entirely before submission.

---

### B5. All contact PII stored unencrypted in AsyncStorage — `expo-secure-store` installed but never used
**Files:** `src/utils/contactsStorage.ts:2,64,81`, `src/utils/eventsStorage.ts:2,11,22`
Every contact name, phone number, birthday, note, and profile image path is written to `AsyncStorage` (unencrypted NSUserDefaults/SQLite on iOS). `expo-secure-store` is in `package.json` but is never imported anywhere. On a jailbroken device or via an iTunes/iMazing backup, all this data is readable in plaintext. Apple Guideline 5.1.1 requires sensitive user data to be stored appropriately. Encrypt the JSON payload with a key from `expo-secure-store`, or store individual sensitive fields directly in Secure Store.

---

### B6. Crash: `SettingsScreen` uses removed `ImagePicker.MediaTypeOptions.Images` API
**File:** `src/screens/settings/SettingsScreen.tsx:224,245`
`MediaTypeOptions` was removed in `expo-image-picker` v17 (the version installed). The other two screens (`AddFriendScreen`, `FriendProfileScreen`) correctly use the new `mediaTypes: ['images']` array syntax. The Settings camera flow will crash at runtime. Apple's reviewers will test the profile photo feature. Change both calls to `mediaTypes: ['images']`.

---

### B7. Crash: `useEvents` hook — no error handling on async storage operations
**File:** `src/hooks/useEvents.ts:14-40`
`createEvent`, `updateEvent`, `deleteEvent`, and `load` all call into AsyncStorage without try/catch. An unhandled rejection (disk full, JSON corruption) crashes the app on Hermes. Wrap each function body in try/catch and expose an `error` state to calling screens.

---

### B8. Crash: `FriendProfileScreen` — `onSave` and `onDelete` have no try/catch
**File:** `src/screens/friends/FriendProfileScreen.tsx:258-299`
Both async handlers call `updateContact`/`removeContact` which internally write to AsyncStorage. Any storage failure produces an unhandled rejection and crashes the app. Wrap both in try/catch with a user-facing `Alert` on failure.

---

### B9. Stuck loading spinner: `SyncContactsScreen` when contacts permission is denied
**File:** `src/screens/friends/SyncContactsScreen.tsx:69-107`
When permission is denied, the function shows an `Alert` and returns early — but `setIsLoading(false)` is only inside the `finally` block that never runs on this path. The screen is permanently stuck showing the activity indicator. Add `setIsLoading(false)` before the early return on the permission-denied path.

---

## HIGH — Fix before TestFlight for a good review outcome

---

### H1. Profile data is never saved — lost on every app restart
**File:** `src/screens/settings/SettingsScreen.tsx:186-189`
`handleSaveProfile` and `handleSaveAvailability` have `// TODO: Save to backend/storage` comments. All entered profile data (name, photo, availability) resets to empty strings each launch. Reviewers will fill in their name, background the app, reopen it, and see it blank. Persist to AsyncStorage on save and load on mount.

---

### H2. Privacy manifest missing `NSPrivacyCollectedDataTypes`
**File:** `app.json:26-37`
The `privacyManifests` block only declares `NSPrivacyAccessedAPITypes`. It does not declare `NSPrivacyCollectedDataTypes` despite the app collecting contact names, phone numbers, birthdays, and user-entered profile data. Add these declarations to both the embedded manifest and the App Store Connect privacy nutrition label.

---

### H3. `expo-camera` is installed but never directly imported
**File:** `package.json:24`
Camera access is correctly handled via `expo-image-picker`. `expo-camera` is an unused dependency that will be linked into the binary, causing Apple's scanner to see `AVCaptureDevice` API usage. Remove `expo-camera` from `package.json`.

---

### H4. `getOrCreateLocalUserId` — no try/catch; `userId` can stay `null` permanently
**File:** `src/utils/localUser.ts:5-11`
If AsyncStorage throws, the rejection is silent, `userId` stays `null`, and the calendar and friend profile screens show permanent loading spinners with no events. Wrap in try/catch; expose a typed error to callers.

---

### H5. `useEvents` — `isLoading` stays `true` when `userId` is empty
**File:** `src/hooks/useEvents.ts:14-19`
The early return `if (!userId) return` exits without calling `setIsLoading(false)`. Add `setIsLoading(false)` before the return.

---

### H6. `FriendProfileScreen` — events filtered by `event.friendId` which doesn't exist on the `Event` type
**File:** `src/screens/friends/FriendProfileScreen.tsx:222-229`
`event.friendId` and `event.friendshipId` are not in the `Event` interface (`src/types/index.ts`). These always evaluate to `undefined`, so the `friendId` navigation path shows 0 linked events for any contact. Remove those branches; filter only by `contactId`.

---

### H7. Bulk contact import is O(n²) — reads and writes the full list for each imported contact
**File:** `src/screens/friends/SyncContactsScreen.tsx:151-156`
`handleImport` calls `addContact` in a `for...await` loop. Each `addContact` call reads the entire stored contacts JSON, appends one item, and writes it all back. Importing 100 contacts triggers 100 full read-sort-write cycles. Collect all new contacts into an array, then do a single `loadContacts()` → append all → single `saveContacts()`.

---

### H8. `expo-contacts` fetches all contacts including full-resolution images with no pagination
**File:** `src/utils/phoneContacts.ts:54-65`
`Contacts.getContactsAsync()` uses `Contacts.Fields.Image` (full-resolution photos) with no `pageSize`. On a device with 500+ contacts this can freeze the UI for several seconds and cause out-of-memory termination. Use `Contacts.Fields.Thumbnail` instead and add `pageSize: 200` with pagination.

---

### H9. Every action button re-loads all contacts from AsyncStorage on each tap
**File:** `src/screens/home/HomeScreen.tsx:401-627`
Call, Message, FaceTime, and "Contacted Recently" all call `loadContacts()` independently on each tap to look up a single contact. The data is already available in `allContacts` from the suggestions hook. Pass the resolved `Contact` object through the suggestion object to action handlers.

---

### H10. App name "Link" is a working placeholder — conflicts likely
**File:** `README.md:1`, `app.json:3`
The README explicitly calls "Link" a working name. Single-word generic names frequently conflict with existing App Store trademarks and are flagged under Guideline 4.1. Finalize a distinctive name before submission; renaming after approval requires a new review cycle.

---

### H11. No pre-permission explanation before contacts permission dialog
**File:** `src/screens/friends/SyncContactsScreen.tsx:69-80`
The iOS contacts permission dialog fires immediately when the user navigates to Sync Contacts, with no contextual explanation first. Apple's HIG and reviewers expect a brief explanation screen before sensitive permission requests. Add an interstitial screen explaining what data is accessed and that it stays on-device.

---

## MEDIUM — Fix before wide TestFlight distribution

- **M1** `src/screens/settings/SettingsScreen.tsx:219` — Photo modal stays open behind the "Permission Denied" Alert when camera access is denied. Call `setShowPhotoModal(false)` before returning.
- **M2** `src/screens/friends/FriendsListScreen.tsx:85-88` — `loadContactsFromStorage` sorts contacts a second time after `loadContacts()` already returns a sorted array. Remove the redundant `.sort()`.
- **M3** `src/screens/friends/FriendsListScreen.tsx` & `SyncContactsScreen.tsx` — `getFilteredContacts()` is called as a plain function in render, re-running a filter over all contacts on every state change. Replace with `useMemo`.
- **M4** `src/screens/home/HomeScreen.tsx:832` & `src/screens/friends/FriendsListScreen.tsx:136` — Network requests to `via.placeholder.com` for every contact without a photo. Replace with a local bundled asset (the project already has `assets/default_photo.png`).
- **M5** `src/components/ErrorBoundary.tsx:26-41` — "Try Again" reuses the same component tree without remounting it. A crash-on-mount will immediately re-crash. Add a `resetKey` counter to state and apply it as `key={resetKey}` on the children wrapper.
- **M6** `src/screens/friends/AddFriendScreen.tsx:148` — Formatted phone string `(555) 123-4567` stored instead of normalized digits. Store `phone.replace(/\D/g, '')`.
- **M7** `src/screens/friends/FriendProfileScreen.tsx:251` — On file copy failure, silently falls back to the picker's temp cache URI, which is purged between sessions. Show an `Alert` to the user instead.
- **M8** `src/utils/localUser.ts` & `src/utils/phoneContacts.ts` — IDs generated with `Math.random()`. Use `globalThis.crypto.randomUUID()` (available in Hermes/Expo 54).
- **M9** `eas.json` — `submit.production.ios` is missing `ascAppId` and `appleTeamId`. Add both to avoid interactive prompts during `eas submit`.
- **M10** Profile images are stored at full picker resolution (potentially 3024×4032px) but displayed at 48px. After copying, resize to max 400×400px using `expo-image-manipulator` to prevent memory pressure when scrolling the contacts list.

---

## LOW — Polish before public release

- **L1** Strip `console.error`/`console.warn` from production builds via `babel-plugin-transform-remove-console` or `if (__DEV__)` guards.
- **L2** Verify `NSPrivacyAccessedAPITypeReasons` reason codes post-build using Xcode's Privacy Report (`Product > Analyze > Privacy Report`).
- **L3** `CalendarScreen.tsx` — nested `FlatList` inside `ScrollView` defeats virtualisation. Consider using a single `FlatList` with `ListHeaderComponent`.
- **L4** `CalendarScreen.tsx` — contact/type picker modals are always mounted even when hidden. Gate them with `{visible && <Modal>}`.
- **L5** `HomeScreen.tsx` — `useFocusEffect` triggers a full contact re-score with `Math.random()` on every tab switch. Debounce or gate on data change.
- **L6** Finalize `app.json` with `ios.minimumOsVersion: "16.0"` and add a `description` field before App Store Connect submission.

---

## Quick Fix Priority Order

1. **B1** — Fix bundle ID (blocks everything else)
2. **B6** — Fix `MediaTypeOptions.Images` crash (immediate reviewer crash)
3. **B3 + B4** — Remove unused `expo-calendar` and `expo-notifications` packages/UI
4. **B2** — Wire up Privacy Policy link
5. **H1** — Persist profile data to AsyncStorage
6. **B7 + B8 + B9** — Add missing try/catch and fix loading spinner
7. **B5** — Encrypt contact storage with `expo-secure-store`
8. **H7** — Fix O(n²) bulk import
9. **H11** — Add pre-permission explanation screen
10. **H2** — Add `NSPrivacyCollectedDataTypes` to privacy manifest
