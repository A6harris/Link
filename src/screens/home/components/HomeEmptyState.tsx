import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GradientButton } from '../../../components';
import { colors, gradients, spacing, typography, shadow } from '../../../styles/theme';

type Props = { onAddContact: () => void };

export function HomeEmptyState({ onAddContact }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconGradient}
        >
          <Ionicons name="people" size={48} color={colors.textLight} />
        </LinearGradient>
      </View>
      <Text style={styles.title}>No friends yet</Text>
      <Text style={styles.body}>Start building your network by adding your first contact!</Text>
      <GradientButton title="Add Your First Contact" icon="person-add" onPress={onAddContact} size="lg" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.xxxxl,
  },
  iconContainer: {
    marginBottom: spacing.xxl,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  title: {
    ...typography.heading,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
});
