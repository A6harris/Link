import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, typography, animations } from '../styles/theme';

interface SnackbarProps {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Distance from the bottom of the screen (e.g. to clear the floating tab bar). */
  bottomOffset?: number;
}

/**
 * Persistent snackbar — stays visible until the parent hides or replaces it.
 * No auto-dismiss: dismissal is driven entirely by the `visible` prop.
 */
const Snackbar: React.FC<SnackbarProps> = ({
  visible,
  message,
  actionLabel,
  onAction,
  bottomOffset = spacing.xxl,
}) => {
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Keep showing the last message while the pill animates out after dismissal.
  const lastMessageRef = useRef(message);
  if (message) lastMessageRef.current = message;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, ...animations.spring }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: animations.timing.fast,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 80,
          duration: animations.timing.normal,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: animations.timing.normal,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, opacity]);

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: bottomOffset }]}>
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[styles.pill, { opacity, transform: [{ translateY }] }]}
      >
        <Text style={styles.message} numberOfLines={2}>
          {lastMessageRef.current}
        </Text>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            hitSlop={spacing.md}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
};

export default Snackbar;

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 480,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadow.float,
  },
  message: {
    ...typography.bodySmall,
    color: colors.textLight,
    flexShrink: 1,
  },
  action: {
    marginLeft: spacing.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  actionPressed: {
    backgroundColor: colors.overlayLight,
  },
  actionLabel: {
    ...typography.label,
    color: colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 13,
  },
});
