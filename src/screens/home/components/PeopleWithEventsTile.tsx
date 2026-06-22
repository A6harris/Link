import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../../../styles/theme';
import { resolveProfileImageUri } from '../../../utils/imageUtils';
import type { Contact } from '../../../types';

type Props = { people: Contact[]; onPress: () => void };

export function PeopleWithEventsTile({ people, onPress }: Props) {
  if (people.length === 0) return null;
  const avatars = people.slice(0, 3);

  return (
    <View style={styles.section}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.tile}>
        <View style={styles.avatars}>
          {avatars.map((c, i) => {
            const uri = resolveProfileImageUri(c.profileImage);
            return (
              <View key={c.id} style={[styles.avatarRing, { marginLeft: i === 0 ? 0 : -14, zIndex: avatars.length - i }]}>
                {uri ? (
                  <Image source={{ uri }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={16} color={colors.primary} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>More friends with events</Text>
          <Text style={styles.subtitle}>People you might be checking in on</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.sm,
  },
  avatars: {
    flexDirection: 'row',
    marginRight: spacing.md,
  },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.surface,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { ...typography.label, fontSize: 15 },
  subtitle: { ...typography.caption, marginTop: spacing.xxs },
});
