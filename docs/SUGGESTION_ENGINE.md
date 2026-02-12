# Suggestion Engine

## Overview

The Suggestion Engine is a local, on-device system that recommends which contacts you should reach out to based on contact frequency preferences, time since last contact, and intelligent scoring. The engine runs entirely client-side with no server dependencies.

## Purpose

The engine helps users maintain their relationships by:
- Surfacing contacts who are approaching or past their preferred contact cadence
- Balancing between different contact frequency tiers (weekly, monthly, etc.)
- Preventing contact fatigue by ensuring variety in suggestions
- Prioritizing overdue contacts while still allowing recently-contacted friends to appear

## Core Algorithm

### Location

The suggestion engine is implemented in `src/screens/home/HomeScreen.tsx` within the `useLocalConnectionSuggestions` hook.

### Scoring Formula

Each contact receives a numerical score calculated as:

```
score = baseScore + approachingBoost + overdueBoost + freshnessPenalty + jitter
```

Higher scores indicate higher priority for outreach.

### Scoring Components

#### 1. Base Score (by Frequency Tier)

Each contact frequency has a baseline score that reflects inherent priority:

| Frequency   | Days Between Contact | Base Score |
|-------------|---------------------|------------|
| Weekly      | 7                   | 45         |
| Biweekly    | 14                  | 42         |
| Monthly     | 30                  | 38         |
| Quarterly   | 90                  | 35         |
| Biannual    | 180                 | 32         |
| Annually    | 365                 | 30         |

**Design Note:** Base scores are intentionally compressed (15-point spread) to allow randomness to overcome frequency bias and surface variety.

#### 2. Urgency Multiplier

Multipliers that scale how quickly different frequencies become urgent:

| Frequency   | Multiplier |
|-------------|-----------|
| Weekly      | 1.2       |
| Biweekly    | 1.1       |
| Monthly     | 1.0       |
| Quarterly   | 0.9       |
| Biannual    | 0.8       |
| Annually    | 0.7       |

#### 3. Ratio Calculation

The algorithm computes how "due" a contact is:

```
ratio = daysSinceLastContact / expectedCadenceDays
```

- `ratio < 1.0`: Contact is not yet due
- `ratio = 1.0`: Contact is exactly due
- `ratio > 1.0`: Contact is overdue

#### 4. Dynamic Modifiers

**Approaching Boost**
- Applies when `ratio < 1`
- Formula: `ratio × 12 × urgencyMultiplier`
- Effect: Gradually increases score as the due date approaches

**Overdue Boost**
- Applies when `ratio >= 1`
- Formula: `min(ratio - 1, 1.5) × 20 × urgencyMultiplier`
- Effect: Strong boost when overdue, capped at 1.5x the cadence
- Example: A monthly contact 45 days overdue gets the same boost as one 60 days overdue

**Freshness Penalty**
- Applies when `ratio < 0.3` (contacted within 30% of cadence)
- Formula: `-5 × (1 - ratio / 0.3)`
- Effect: Penalizes recently-contacted friends to encourage variety
- Maximum penalty: -5 points

**Jitter**
- Random value: `0-30 points`
- Effect: Ensures variety in suggestions even among similar-scored contacts
- Critical for allowing lower-frequency contacts to appear despite lower base scores

## Selection Process

### Step 1: Score All Contacts

Every contact in local storage is scored using the formula above.

### Step 2: Sort and Create Candidate Pool

Contacts are sorted by score (descending) and the top 15 are selected as candidates.

### Step 3: Weighted Random Selection

Instead of always picking the highest scorer, the algorithm uses **weighted random selection**:
- Higher-scored contacts have higher probability of selection
- Lower-scored contacts still have a chance
- Selects 10 contacts from the candidate pool

### Step 4: Prevent Consecutive Duplicates

The engine tracks the last suggested contact ID and excludes it from the next suggestion cycle (unless only 1 contact exists).

### Step 5: Display Top Suggestion

The highest-scoring contact from the selected pool becomes the featured "Suggested Connection" on the Home screen.

## Configuration

### Modifying Base Scores

Edit `FREQUENCY_BASE_SCORE` in `HomeScreen.tsx`:

```typescript
const FREQUENCY_BASE_SCORE: Record<FrequencyKey, number> = {
  weekly: 45,
  biweekly: 42,
  // ... etc
};
```

**Recommendation:** Keep the spread narrow (10-20 points) to maintain variety.

### Modifying Urgency

Edit `FREQUENCY_URGENCY_MULTIPLIER` in `HomeScreen.tsx`:

```typescript
const FREQUENCY_URGENCY_MULTIPLIER: Record<FrequencyKey, number> = {
  weekly: 1.2,
  biweekly: 1.1,
  // ... etc
};
```

### Modifying Randomness

Adjust the jitter range in the `scoreContact` function:

```typescript
const jitter = Math.random() * 30; // Increase for more variety
```

**Higher jitter** = More randomness, less predictable
**Lower jitter** = More deterministic, favors higher base scores

## User Interactions

### Shuffle Button

Triggers `generateNewSuggestion()` which:
1. Re-computes all scores (new jitter values)
2. Excludes the previous suggestion
3. Performs weighted random selection
4. Displays a different contact

### Call / Message / FaceTime Actions

When a user contacts someone:
1. Updates `lastContacted` timestamp to now
2. Triggers a refresh
3. Contact's score drops dramatically (freshness penalty)
4. Contact becomes unlikely to appear in next suggestion

### "Contacted Recently" Button

Manually marks a contact as contacted today without opening a communication app. Same effect as actual contact actions.

### Pull to Refresh

Reloads all contacts from storage and re-computes suggestions.

## Algorithm Behavior Examples

### Example 1: Typical Mix

Contacts:
- 5 biweekly contacts (none overdue)
- 5 monthly contacts (none overdue)

**Behavior:** Both biweekly and monthly contacts will appear in suggestions. Biweekly contacts appear more frequently but monthly contacts regularly surface due to high jitter.

### Example 2: Overdue Contact

Contact:
- Monthly cadence (30 days)
- Last contacted: 50 days ago
- Ratio: 1.67

**Score calculation:**
```
baseScore = 38
approachingBoost = 0 (ratio >= 1)
overdueBoost = min(0.67, 1.5) × 20 × 1.0 = 13.4
freshnessPenalty = 0 (ratio > 0.3)
jitter = 0-30

Total: 51.4 + jitter (range: 51.4 - 81.4)
```

This contact will likely appear in suggestions but isn't guaranteed to be #1 due to jitter.

### Example 3: Recently Contacted

Contact:
- Weekly cadence (7 days)
- Last contacted: 1 day ago
- Ratio: 0.14

**Score calculation:**
```
baseScore = 45
approachingBoost = 0.14 × 12 × 1.2 = 2.0
overdueBoost = 0
freshnessPenalty = -5 × (1 - 0.14/0.3) = -2.7
jitter = 0-30

Total: 44.3 + jitter (range: 44.3 - 74.3)
```

This contact has reduced score and is unlikely to be suggested immediately, but may still appear after several shuffles.

## Technical Details

### State Management

The hook maintains:
- `suggestions`: Array of top 10 scored contacts
- `topSuggestion`: The #1 suggestion displayed prominently
- `allContacts`: Full contact list from storage
- `lastSuggestedFriendIdRef`: Ref to prevent consecutive duplicates

### Performance

- **Computation:** O(n log n) where n is total contacts
- **Storage:** All operations use local AsyncStorage
- **Refresh:** Triggered on focus, manual refresh, or after contact updates

### Dependencies

- `loadContacts()`: Loads contacts from local storage
- `CONTACT_FREQUENCY_CONFIG`: Maps frequency keys to day values and labels
- `DEFAULT_CONTACT_FREQUENCY`: Fallback frequency (monthly)

## Future Enhancements

Potential improvements to consider:

1. **Birthday Weighting**: Boost score for contacts with upcoming birthdays
2. **Time-of-Day Optimization**: Suggest different contacts based on time (work friends during day, family in evening)
3. **Streak Tracking**: Reward maintaining consistent contact cadences
4. **Manual Pinning**: Allow users to pin certain contacts to appear more often
5. **Group Suggestions**: Suggest reaching out to multiple friends at once
6. **Historical Analysis**: Learn from user behavior to adjust base scores over time

## Debugging

### View Raw Scores

Add console logging in `scoreContact`:

```typescript
const score = baseScore + approachingBoost + overdueBoost + freshnessPenalty + jitter;
console.log(`${c.firstName}: base=${baseScore}, approaching=${approachingBoost}, overdue=${overdueBoost}, fresh=${freshnessPenalty}, jitter=${jitter}, total=${score}`);
return score;
```

### Test Specific Scenarios

Temporarily modify jitter for deterministic testing:

```typescript
const jitter = 15; // Fixed value instead of Math.random() * 30
```

### Force Specific Contact

Temporarily override the top suggestion:

```typescript
// In compute callback, before setSuggestions
const forcedContact = enriched.find(c => c.friendId === 'specific-id');
if (forcedContact) {
  selectedSuggestions.unshift(forcedContact);
}
```

## Related Files

- `src/screens/home/HomeScreen.tsx`: Main implementation
- `src/constants/contactFrequency.ts`: Frequency configuration
- `src/utils/contactsStorage.ts`: Contact storage operations
- `src/types/index.ts`: Type definitions

## Conclusion

The Suggestion Engine balances deterministic priority (frequency, overdue status) with randomness to create a dynamic, non-repetitive experience. The key insight is using compressed base scores with high jitter to ensure variety while still respecting user-defined contact preferences.
