// src/navigation/RootNavigator.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { initializeAuth, setUser, clearUser, setSession } from '../store/slices/authSlice';
import { onAuthStateChange, fetchUserProfile } from '../services/supabase/auth';
import type { RootState, AppDispatch } from '../store/store';
import { colors, typography, spacing, gradients } from '../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function RootNavigator() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isInitializing } = useSelector((s: RootState) => s.auth);

  // 1. Restore session on mount
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  // 2. Listen for auth state changes (login, logout, token refresh)
  useEffect(() => {
    const { data: subscription } = onAuthStateChange(async (event, session) => {
      dispatch(setSession(session));

      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        dispatch(
          setUser(
            profile ?? {
              id: session.user.id,
              display_name: session.user.email ?? '',
              email: session.user.email,
            },
          ),
        );
      }

      if (event === 'SIGNED_OUT') {
        dispatch(clearUser());
      }
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [dispatch]);

  // 3. Loading / splash while session is being checked
  if (isInitializing) {
    return (
      <View style={styles.splash}>
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.splashIcon}
        >
          <Ionicons name="link" size={40} color={colors.textLight} />
        </LinearGradient>
        <Text style={styles.splashTitle}>Link</Text>
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.splashSpinner}
        />
      </View>
    );
  }

  // 4. Gate: authenticated → Main tabs, unauthenticated → Auth stack
  return isAuthenticated ? <MainNavigator /> : <AuthNavigator />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  splashTitle: {
    ...typography.displayLarge,
    color: colors.primary,
    marginBottom: spacing.xxl,
  },
  splashSpinner: {
    marginTop: spacing.md,
  },
});
