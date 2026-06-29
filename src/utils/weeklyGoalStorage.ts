// src/utils/weeklyGoalStorage.ts
// Persists the *target* for the current week so the weekly-goal denominator
// stays stable all week. See resolveWeeklyGoal in screens/home/weeklyGoal.ts
// for why a live recomputation alone is not enough.
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@link:weeklyGoalSnapshot';

// `weekStart` is the Monday-00:00 epoch (ms) the target was established for;
// `target` is the frozen goal for that week.
export type WeeklyGoalSnapshot = { weekStart: number; target: number };

export async function loadWeeklyGoalSnapshot(): Promise<WeeklyGoalSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WeeklyGoalSnapshot;
  } catch (error) {
    console.warn('Failed to read weekly goal snapshot', error);
    return null;
  }
}

export async function saveWeeklyGoalSnapshot(snapshot: WeeklyGoalSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn('Failed to write weekly goal snapshot', error);
  }
}
