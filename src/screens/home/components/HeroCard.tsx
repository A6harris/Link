import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography, fontFamily } from '../../../styles/theme';
import { DEFAULT_CONTACT_FREQUENCY } from '../../../constants/contactFrequency';
import { resolveProfileImageUri } from '../../../utils/imageUtils';
import { fullName, cadenceSubtitle } from '../homeUtils';
import type { ConnectionSuggestion } from '../homeTypes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_SIZE = SCREEN_WIDTH;

type Props = {
  suggestion: ConnectionSuggestion;
  onPress: () => void;
  onCall: () => void;
  onContactedRecently: () => void;
  onShuffle: () => void;
};

export function HeroCard({ suggestion, onPress, onCall, onContactedRecently, onShuffle }: Props) {
  const name = fullName(suggestion.friend);
  const frequency = suggestion.meta?.frequency ?? DEFAULT_CONTACT_FREQUENCY;
  const subtitle = cadenceSubtitle(frequency, suggestion.meta?.lastContactedISO);
  const imageUri = resolveProfileImageUri(suggestion.friend.profileImage);

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={onPress} style={styles.container}>
      <Image
        source={imageUri ? { uri: imageUri } : require('../../../../assets/default_photo.png')}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Dark scrim anchored to the bottom keeps light text legible over any photo */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.72)']}
        locations={[0.4, 0.7, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Pinned bottom-left at a fixed width; grows upward as the subtitle wraps */}
      <View style={styles.textBlock} pointerEvents="none">
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={onCall} activeOpacity={0.85} style={styles.actionCircle}>
          <Ionicons name="call" size={18} color={colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onContactedRecently} activeOpacity={0.85} style={styles.actionCircle}>
          <Ionicons name="checkmark" size={18} color={colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onShuffle} activeOpacity={0.85} style={styles.actionCircle}>
          <Ionicons name="shuffle" size={18} color={colors.textLight} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    backgroundColor: colors.surfaceMuted,
  },
  image: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  textBlock: {
    position: 'absolute',
    left: spacing.xl,
    bottom: spacing.xxl,
    width: '50%',
  },
  name: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    color: colors.textLight,
    letterSpacing: -0.3,
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xs,
  },
  actions: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
