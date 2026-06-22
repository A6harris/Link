import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontFamily } from '../../../styles/theme';
import { formatLastContactedLong } from '../homeUtils';

type Props = {
  lastContactedISO?: string | null;
  onMore: () => void;
};

export function HeroMetaBar({ lastContactedISO, onMore }: Props) {
  return (
    <View style={styles.bar}>
      <Text style={styles.text}>{formatLastContactedLong(lastContactedISO)}</Text>
      <TouchableOpacity
        onPress={onMore}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundSunken,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  text: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: colors.black,
  },
});
