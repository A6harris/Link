import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, spacing, radius, typography, fontFamily } from '../../../styles/theme';
import { formatDate } from '../homeUtils';
import type { WeeklyGoal } from '../homeTypes';

type Props = { weeklyGoal?: WeeklyGoal };

export function HomeHeader({ weeklyGoal }: Props) {
  const showGoal = !!weeklyGoal && weeklyGoal.goal > 0;
  const pct = showGoal ? Math.min(1, weeklyGoal.done / weeklyGoal.goal) : 0;
  const caughtUp = showGoal && weeklyGoal.remaining === 0;

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.dateTitle}>{formatDate()}</Text>
        <TouchableOpacity style={styles.notificationBtn}>
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {showGoal && (
        <View style={styles.goal}>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>
              {caughtUp
                ? 'All caught up this week'
                : `${weeklyGoal.remaining} more ${weeklyGoal.remaining === 1 ? 'connection' : 'connections'} this week`}
            </Text>
            <Text style={styles.goalCount}>{weeklyGoal.done}/{weeklyGoal.goal}</Text>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTitle: {
    ...typography.heading,
    fontSize: 22,
  },
  notificationBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goal: {
    marginTop: spacing.md,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  goalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  goalCount: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
