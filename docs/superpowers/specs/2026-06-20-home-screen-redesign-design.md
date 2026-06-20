# Home Screen Redesign — Design Spec

**Date:** 2026-06-20
**Branch:** `ek-home-screen-redesign`
**Status:** Approved (design), pending implementation plan

## Goal

Redesign the Link home screen to match `Downloads/home_screen_redesign.png`, and
propagate the new color system to the rest of the app while leaving other
screens' layouts unchanged.

Reference mockup elements:
- Cream/off-white background everywhere.
- A full-bleed hero image (no card, no border) whose bottom fades into the
  background, with the friend's name + a contextual subtitle in cream text.
- Flat "reasons to reach out" bullet rows under the hero.
- A conditional tile suggesting other contacts who have upcoming events.
- Normalized bottom nav (no special center button), purple active state.
- Purple as the single brand color (no pink/magenta).

## Decisions (from brainstorming)

- **Reasons data source:** upcoming **birthdays** (`Contact.birthday`) **+ Events
  store** entries linked to a contact (`Event.contactId`, populated via the
  Calendar screen). The hero's bullet rows reuse the same reason model plus the
  existing detail rows.
- **Suggestions tile tap:** opens a lightweight **modal** listing qualifying
  contacts (name + reason); tapping one **promotes that contact to the hero**.
- **Hero tappable affordance:** rely on the **"…" button** only (plus tapping
  the image). No extra on-image cue.
- **Color scope:** **purple-only** system. Cream backgrounds app-wide; retire
  pink/magenta in favor of purple tones. Semantic colors (success/warning/
  danger) are retained.
- **Header:** keep the greeting, **date line, and bell** (recolor only).
- **Weekly-goal strip:** **kept in the hero**, pinned to the **top**, compact —
  must not take much vertical space.

## Architecture

A single reason model feeds every new surface. New presentational components are
introduced; recoloring is centralized in `theme.ts` (23 files already consume
those tokens).

### Reason model — `src/screens/home/homeReasons.ts` (new)

```ts
type ReasonKind = 'birthday' | 'event' | 'cadence';

type ContactReason = {
  kind: ReasonKind;
  icon: IoniconName;     // e.g. 'gift-outline', 'briefcase-outline', 'time-outline'
  text: string;          // e.g. "Birthday is Friday", "New job started last month"
  date?: string;         // ISO, when applicable (for sorting / windowing)
};
```

- `getContactReasons(contact, events, opts)` → `ContactReason[]`
  - Upcoming **birthday** within the window (default 30 days) → one reason.
  - Each **Event** with `contactId === contact.id` and `date` within the window
    → one reason, icon chosen by `Event.type`.
  - Reasons are sorted by soonest date.
- `hasQualifyingReason(contact, events, opts)` → `boolean`
  - True if the contact has at least one **birthday or event** reason in-window
    (cadence alone does NOT qualify a contact for the tile).
- **Window:** 30 days, defined as a single constant in this file.
- The hero bullet list additionally appends the existing detail rows (last
  contacted, cadence, status, notes) after the qualifying reasons.

### Events loading — `useConnectionSuggestions.ts` (modified)

- Resolve the local user id (`getOrCreateLocalUserId`) and `loadEvents(userId)`
  alongside the existing `loadContacts()` in `compute()`.
- Expose:
  - `events: Event[]` (raw, for reason computation),
  - `peopleWithEvents: Contact[]` — contacts **other than the current hero** that
    satisfy `hasQualifyingReason`, sorted by soonest reason.
- Add a way to **promote a specific contact to the hero** (e.g.
  `setHeroContact(contactId)`), reordering `suggestions` so that contact is
  `topSuggestion` without re-rolling the random scoring. Reuses the existing
  `restoreSuggestion`-style state update.

## Components

### `HeroCard` — `src/screens/home/components/HeroCard.tsx` (new; replaces `FriendCard` on home)

- Full-bleed photo (bleeds to screen edges), **no border, no card chrome**.
- Bottom `LinearGradient` overlay fades from `transparent` → **`colors.background`
  (cream)** so the image melts into the page.
- **Compact weekly-goal strip** pinned to the **top edge** (recolored, minimal
  height) — only when `weeklyGoal.goal > 0`.
- Name + subtitle in **cream text** (`colors.background`/`textLight`), positioned
  in the upper-middle of the photo (clear of the bottom gradient), with a subtle
  text-shadow for legibility on light photos.
- Subtitle: cadence phrasing derived from frequency + last-contacted (helper in
  `homeUtils`, e.g. "You usually talk every couple of weeks — it's been a little
  while").
- **Two circular translucent quick actions** near the name: **Call** (`tel:`)
  and **"…"** (more).
- Tapping the **image** OR the **"…"** button opens `SuggestionDetailModal`.

### `FriendHighlights` — `src/screens/home/components/FriendHighlights.tsx` (new; replaces `AboutFriend`)

- Flat icon+text **bullet rows on cream, no white card**.
- Rows = `getContactReasons(heroContact, events)` (qualifying reasons first),
  then the existing detail rows from `AboutFriend` (last contacted, cadence,
  status, notes), restyled as flat rows.

### `PeopleWithEventsTile` — `src/screens/home/components/PeopleWithEventsTile.tsx` (new)

- Renders **only if `peopleWithEvents.length > 0`** (requirement 3).
- Stacked avatars + "More friends with events" / "People you might be checking
  in on" (soft elevated surface).
- Tap → opens `PeopleWithEventsModal`.

### `PeopleWithEventsModal` — `src/screens/home/components/PeopleWithEventsModal.tsx` (new)

- Lightweight modal listing each `peopleWithEvents` contact: avatar, name, and
  their soonest reason text.
- Tapping a row calls `setHeroContact(contactId)` and dismisses the modal,
  switching that contact into the hero.

### `SuggestionDetailModal` (modified)

- Behavior unchanged (Call / Message / FaceTime / Contacted Recently / Shuffle /
  Dismiss). Gradients recolored to purple. This is the "user card" opened by the
  hero "…" / image tap.

### `HomeScreen` (modified)

- Compose: `HomeHeader` → `HeroCard` → `FriendHighlights` →
  `PeopleWithEventsTile` (conditional) → modals.
- Flat **cream** background (drop the multi-hue background gradient).
- Empty state unchanged (recolor only).

## Navigation

### `FloatingTabBar` (modified)

- **Reorder:** Home, Calendar, People, Settings.
- **Remove** the special center gradient Home button; all four tabs share one
  treatment: **icon + label**.
- Active = **purple** (`colors.primary`) icon + label; inactive = `textMuted`.
- Keep the floating blurred-pill shell. Friends route **displayed as "People"**.

### `MainNavigator` (modified)

- Reorder `Tab.Screen`s to match the new tab order (Home, Calendar, Friends,
  Settings). Route name stays `Friends`; only the tab label reads "People".

## Color system — `src/styles/theme.ts` (modified)

- `background` → cream `#F5F1E8`; `backgroundGradientStart/End` → subtle cream
  tones (keeps existing gradient code working but reads flat).
- Retire pink/magenta: `accent`, `accentSoft`, `gradientMid`, `gradientEnd`,
  `textGradientStart/End`, and the `gradients.primary` / `gradients.accent` /
  `gradients.storyRing` arrays all shift into a **purple range**
  (`#9B59B6 → #8E44AD → #7B2D8E`). `primary` (deep purple) and
  `primaryLight`/`primarySoft` (lavender) retained.
- **Keep** semantic `success` (teal), `warning` (orange), `danger` (red).
- Stray hardcoded colors swept to tokens:
  - `src/screens/events/EventsScreen.tsx` (`#f8f9fa`, `#333`, `#666`).
  - `src/screens/friends/SyncContactsScreen.tsx` gradient `['#FF3B30','#E91E63']`
    → purple.

## Files

**New**
- `src/screens/home/homeReasons.ts`
- `src/screens/home/components/HeroCard.tsx`
- `src/screens/home/components/FriendHighlights.tsx`
- `src/screens/home/components/PeopleWithEventsTile.tsx`
- `src/screens/home/components/PeopleWithEventsModal.tsx`

**Modified**
- `src/styles/theme.ts`
- `src/screens/home/HomeScreen.tsx`
- `src/screens/home/useConnectionSuggestions.ts`
- `src/screens/home/homeUtils.ts` (cadence-subtitle helper)
- `src/screens/home/components/SuggestionDetailModal.tsx`
- `src/components/FloatingTabBar.tsx`
- `src/navigation/MainNavigator.tsx`
- `src/screens/events/EventsScreen.tsx`
- `src/screens/friends/SyncContactsScreen.tsx`

**Removed / now unused** (only consumer is the home screen)
- `src/components/FriendCard.tsx`
- `src/screens/home/components/FeaturedCardSection.tsx`
- `src/screens/home/components/AboutFriend.tsx`
- `src/screens/home/components/WeeklyGoalBar.tsx` is **kept** (compact strip
  reused in `HeroCard`).

## Testing / Verification

- Existing Jest suite must pass (`npm test`).
- Unit-test `homeReasons` (birthday windowing, event linkage, qualifying logic,
  hero exclusion from `peopleWithEvents`).
- Manual (Expo): hero renders full-bleed and melts into cream; "…"/image open the
  detail modal; Call works; tile appears only when other contacts have in-window
  events and hidden otherwise; tapping a modal row swaps the hero; nav reordered
  with purple active state; other screens recolored but unchanged in layout.

## Out of Scope

- Header layout changes (date/bell retained, recolor only).
- New event-creation UI (events already created via Calendar screen).
- Any behavior change to Calendar/Friends/Settings beyond recolor.
