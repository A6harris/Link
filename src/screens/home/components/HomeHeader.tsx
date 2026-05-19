import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadow } from '../../../styles/theme';
import { getGreeting, formatDate } from '../homeUtils';

export function HomeHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.dateText}>{formatDate()}</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  dateText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
});
