import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, radius, gradients } from '../../../styles/theme';
import type { WeeklyGoal } from '../homeTypes';

type Props = WeeklyGoal;

// Compact progress strip designed to overlay the top edge of the FriendCard.
// Uses a dark scrim + light text so it stays legible over the profile photo.
export function WeeklyGoalBar({ goal, done, remaining }: Props) {
  if (goal === 0) return null;

  const pct = Math.min(1, done / goal);
  const allDone = remaining === 0;

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        <Text style={styles.label} numberOfLines={1}>
          {allDone
            ? 'All caught up this week 🎉'
            : `${remaining} more ${remaining === 1 ? 'connection' : 'connections'} this week`}
        </Text>
        <Text style={styles.count}>{done}/{goal}</Text>
      </View>
      <View style={styles.track}>
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${pct * 100}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  count: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: spacing.sm,
  },
  track: {
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
