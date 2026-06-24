import React, { useCallback, useEffect, useRef } from 'react';
import {
  View, Text, Image, Modal, ScrollView, TouchableOpacity, StyleSheet, Animated, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../../../styles/theme';
import { resolveProfileImageUri } from '../../../utils/imageUtils';
import { fullName } from '../homeUtils';
import { getContactReasons } from '../homeReasons';
import type { Contact, Event } from '../../../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  visible: boolean;
  people: Contact[];
  events: Event[];
  onSelect: (contactId: string) => void;
  onDismiss: () => void;
};

export function PeopleWithEventsModal({ visible, people, events, onSelect, onDismiss }: Props) {
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

  // Slide the card back down before invoking the callback so closing mirrors the pop-up.
  const slideDownThen = useCallback((after: () => void) => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 240,
      useNativeDriver: true,
    }).start(() => after());
  }, [translateY]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => slideDownThen(onDismiss)}>
      <View style={styles.backdrop}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        <Animated.View style={[styles.card, { transform: [{ translateY }] }]}>
          <Text style={styles.heading}>Friends with events</Text>
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {people.map(c => {
              const uri = resolveProfileImageUri(c.profileImage);
              const reason = getContactReasons(c, events)[0]?.text ?? 'Upcoming event';
              return (
                <TouchableOpacity
                  key={c.id}
                  style={styles.row}
                  activeOpacity={0.85}
                  onPress={() => slideDownThen(() => onSelect(c.id))}
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Ionicons name="person" size={20} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.rowText}>
                    <Text style={styles.name} numberOfLines={1}>{fullName(c)}</Text>
                    <Text style={styles.reason} numberOfLines={1}>{reason}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.dismissBtn} onPress={() => slideDownThen(onDismiss)}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
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
    maxHeight: '70%',
    ...shadow.float,
  },
  heading: {
    ...typography.heading,
    fontSize: 22,
    marginBottom: spacing.lg,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  avatarFallback: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  name: { ...typography.label, fontSize: 16 },
  reason: { ...typography.bodySmall, marginTop: spacing.xxs },
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
