import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FriendCard } from '../../../components';
import { colors, spacing, typography } from '../../../styles/theme';
import { CONTACT_FREQUENCY_CONFIG, DEFAULT_CONTACT_FREQUENCY } from '../../../constants/contactFrequency';
import { fullName, formatLastContacted } from '../homeUtils';
import type { ConnectionSuggestion } from '../homeTypes';

type Props = {
  suggestion: ConnectionSuggestion;
  onShuffle: () => void;
  onPress: () => void;
  onCall: () => void;
  onFaceTime: () => void;
  onMessage: () => void;
  onContactedRecently: () => void;
};

export function FeaturedCardSection({
  suggestion,
  onShuffle,
  onPress,
  onCall,
  onFaceTime,
  onMessage,
  onContactedRecently,
}: Props) {
  const name = fullName(suggestion.friend);
  const lastText = formatLastContacted(suggestion.meta?.lastContactedISO);
  const cadence = suggestion.meta?.frequency ?? DEFAULT_CONTACT_FREQUENCY;
  const cadenceLabel = CONTACT_FREQUENCY_CONFIG[cadence].shortLabel;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Suggested Connection</Text>
        <TouchableOpacity onPress={onShuffle} style={styles.shuffleBtn}>
          <Ionicons name="shuffle" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <FriendCard
        name={name}
        imageUri={suggestion.friend.profileImage}
        lastContactedText={lastText}
        cadenceLabel={cadenceLabel}
        onPress={onPress}
        onCall={onCall}
        onFaceTime={onFaceTime}
        onMessage={onMessage}
        onSnooze={onShuffle}
        onContactedRecently={onContactedRecently}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
  },
  shuffleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
