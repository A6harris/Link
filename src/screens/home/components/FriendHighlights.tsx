import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../../styles/theme';
import { CONTACT_FREQUENCY_CONFIG, DEFAULT_CONTACT_FREQUENCY } from '../../../constants/contactFrequency';
import { daysSince, formatBirthday, getDaysUntilBirthday } from '../homeUtils';
import { getContactReasons } from '../homeReasons';
import type { Contact, Event } from '../../../types';

type Props = { contact: Contact; events: Event[] };

export function FriendHighlights({ contact, events }: Props) {
  const reasons = getContactReasons(contact, events);
  const hasBirthdayReason = reasons.some(r => r.kind === 'birthday');

  const frequency = contact.contactFrequency ?? DEFAULT_CONTACT_FREQUENCY;
  const frequencyConfig = CONTACT_FREQUENCY_CONFIG[frequency];
  const lastContactedDays = daysSince(contact.lastContacted);
  const daysRemaining = frequencyConfig.days - lastContactedDays;
  const isOverdue = daysRemaining <= 0;
  const formattedBirthday = formatBirthday(contact.birthday);
  const daysUntilBirthday = getDaysUntilBirthday(contact.birthday);

  return (
    <View style={styles.section}>
      {reasons.map((r, i) => (
        <Reason key={`${r.kind}-${i}`} iconName={r.icon} text={r.text} />
      ))}

      <Row
        iconName={isOverdue ? 'calendar-outline' : 'checkmark-circle-outline'}
        iconBg={isOverdue ? colors.warningSoft : colors.successSoft}
        iconColor={isOverdue ? colors.warning : colors.success}
        label="Status"
        value={isOverdue ? 'Check-in recommended' : `${daysRemaining} days until next check-in`}
        valueColor={isOverdue ? colors.warning : colors.success}
      />
      {!hasBirthdayReason && formattedBirthday && (
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
      {contact.notes && (
        <Row
          iconName="document-text-outline"
          iconBg={colors.surfaceMuted}
          iconColor={colors.textSecondary}
          label="Notes"
          value={contact.notes}
          numberOfLines={2}
        />
      )}
    </View>
  );
}

function Reason({ iconName, text }: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  return (
    <View style={styles.reasonRow}>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={iconName} size={18} color={colors.primary} />
      </View>
      <Text style={styles.reasonText} numberOfLines={2}>{text}</Text>
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
    marginTop: spacing.lg,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  reasonText: {
    ...typography.label,
    flex: 1,
    fontSize: 16,
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
