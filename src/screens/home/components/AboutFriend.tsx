import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../../../styles/theme';
import { CONTACT_FREQUENCY_CONFIG, DEFAULT_CONTACT_FREQUENCY } from '../../../constants/contactFrequency';
import { daysSince, formatLastContacted, formatBirthday, getDaysUntilBirthday } from '../homeUtils';
import type { ConnectionSuggestion } from '../homeTypes';

type Props = { suggestion: ConnectionSuggestion };

export function AboutFriend({ suggestion }: Props) {
  const frequency = suggestion.meta?.frequency ?? DEFAULT_CONTACT_FREQUENCY;
  const frequencyConfig = CONTACT_FREQUENCY_CONFIG[frequency];
  const lastContactedDays = daysSince(suggestion.meta?.lastContactedISO);
  const birthday = suggestion.meta?.birthday;
  const formattedBirthday = formatBirthday(birthday);
  const daysUntilBirthday = getDaysUntilBirthday(birthday);
  const notes = suggestion.meta?.notes;
  const daysRemaining = frequencyConfig.days - lastContactedDays;
  const isOverdue = daysRemaining <= 0;

  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <Row
          iconName="time-outline"
          iconBg={colors.primarySoft}
          iconColor={colors.primary}
          label="Last Contacted"
          value={suggestion.meta?.lastContactedISO
            ? formatLastContacted(suggestion.meta.lastContactedISO)
            : 'Never contacted'}
        />
        <Row
          iconName="repeat-outline"
          iconBg={colors.accentSoft}
          iconColor={colors.accent}
          label="Contact Cadence"
          value={frequencyConfig.label}
        />
        <Row
          iconName={isOverdue ? 'calendar-outline' : 'checkmark-circle-outline'}
          iconBg={isOverdue ? colors.warningSoft : colors.successSoft}
          iconColor={isOverdue ? colors.warning : colors.success}
          label="Status"
          value={isOverdue ? 'Check-in recommended' : `${daysRemaining} days until next check-in`}
          valueColor={isOverdue ? colors.warning : colors.success}
        />
        {formattedBirthday && (
          <Row
            iconName="gift-outline"
            iconBg={colors.accentSoft}
            iconColor={colors.accent}
            label="Birthday"
            value={daysUntilBirthday !== null && daysUntilBirthday <= 30
              ? `${formattedBirthday} (${daysUntilBirthday} days away)`
              : formattedBirthday}
          />
        )}
        {notes && (
          <Row
            iconName="document-text-outline"
            iconBg={colors.surfaceMuted}
            iconColor={colors.textSecondary}
            label="Notes"
            value={notes}
            numberOfLines={2}
          />
        )}
      </View>
    </View>
  );
}

function Row({ iconName, iconBg, iconColor, label, value, valueColor, numberOfLines }: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  valueColor?: string;
  numberOfLines?: number;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text
          style={[styles.value, valueColor ? { color: valueColor } : undefined]}
          numberOfLines={numberOfLines}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: { flex: 1 },
  label: { ...typography.caption, marginBottom: spacing.xxs },
  value: { ...typography.label },
});
