import React, { useCallback, useEffect, useRef } from 'react';
import {
  View, Text, Modal, Image, TouchableOpacity, StyleSheet, Platform, Animated, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GradientButton } from '../../../components';
import { colors, gradients, spacing, radius, typography, shadow } from '../../../styles/theme';
import { fullName } from '../homeUtils';
import { resolveProfileImageUri } from '../../../utils/imageUtils';
import type { ConnectionSuggestion } from '../homeTypes';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  visible: boolean;
  suggestion: ConnectionSuggestion | undefined;
  onDismiss: () => void;
  onCall: () => void;
  onMessage: () => void;
  onFaceTime: () => void;
  onContactedRecently: () => void;
  onShuffle: () => void;
};

export function SuggestionDetailModal({
  visible,
  suggestion,
  onDismiss,
  onCall,
  onMessage,
  onFaceTime,
  onContactedRecently,
  onShuffle,
}: Props) {
  // Fade the blurred backdrop over the whole screen, then slide only the card up.
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 220,
        mass: 0.9,
      }).start();
    }
  }, [visible, translateY]);

  // Slide the card back down before unmounting so dismiss mirrors the pop-up.
  const handleDismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 240,
      useNativeDriver: true,
    }).start(() => onDismiss());
  }, [onDismiss, translateY]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        <Animated.View style={[styles.card, { transform: [{ translateY }] }]}>
          {suggestion && (
            <>
              <View style={styles.imageContainer}>
                <LinearGradient
                  colors={[...gradients.storyRing]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.imageRing}
                >
                  <View style={styles.imageInner}>
                    {suggestion.friend.profileImage ? (
                      <Image source={{ uri: resolveProfileImageUri(suggestion.friend.profileImage) }} style={styles.image} />
                    ) : (
                      <View style={[styles.image, styles.imageFallback]}>
                        <Ionicons name="person" size={48} color={colors.primary} />
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </View>

              <Text style={styles.name}>{fullName(suggestion.friend)}</Text>
              <Text style={styles.reasons}>
                {suggestion.reasons.map(r => r.description).join(' • ')}
              </Text>

              <View style={styles.actions}>
                <GradientButton title="Call Now" icon="call" onPress={onCall} fullWidth />
                <GradientButton title="Send Message" icon="chatbubble" variant="outline" onPress={onMessage} fullWidth />
                {Platform.OS === 'ios' && (
                  <GradientButton title="FaceTime" icon="videocam" variant="outline" onPress={onFaceTime} fullWidth />
                )}
                <GradientButton
                  title="Contacted Recently"
                  icon="checkmark-circle-outline"
                  variant="outline"
                  onPress={onContactedRecently}
                  fullWidth
                />
                <TouchableOpacity style={styles.shuffleRow} onPress={onShuffle}>
                  <Ionicons name="shuffle" size={20} color={colors.primary} />
                  <Text style={styles.shuffleText}>Try Someone Else</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xxxl,
    borderTopRightRadius: radius.xxxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxxl,
    ...shadow.float,
  },
  imageContainer: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  imageRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imageFallback: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...typography.heading,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  reasons: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  actions: {
    gap: spacing.md,
  },
  shuffleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  shuffleText: {
    ...typography.buttonSecondary,
  },
  dismissBtn: {
    paddingVertical: spacing.md,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  dismissText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
