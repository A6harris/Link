import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { colors, radius, spacing, shadow, fontFamily } from '../styles/theme';

const TAB_BAR_HEIGHT = 68;

interface TabButtonProps {
  isFocused: boolean;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconNameOutline: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  onLongPress: () => void;
}

function TabButton({
  isFocused,
  label,
  iconName,
  iconNameOutline,
  onPress,
  onLongPress,
}: TabButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const tint = isFocused ? colors.primary : colors.textMuted;

  return (
    <Animated.View style={[styles.tabButton, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        style={styles.tabButtonInner}
      >
        <Ionicons name={isFocused ? iconName : iconNameOutline} size={24} color={tint} />
        <Text style={[styles.label, { color: tint }]} numberOfLines={1}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const getIconNames = (routeName: string): { filled: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap } => {
    switch (routeName) {
      case 'Home':
        return { filled: 'home', outline: 'home-outline' };
      case 'Calendar':
        return { filled: 'calendar', outline: 'calendar-outline' };
      case 'Friends':
        return { filled: 'people', outline: 'people-outline' };
      case 'Events':
        return { filled: 'sunny', outline: 'sunny-outline' };
      case 'Settings':
        return { filled: 'settings', outline: 'settings-outline' };
      default:
        return { filled: 'home', outline: 'home-outline' };
    }
  };

  // Check if any route wants the tab bar hidden
  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const tabBarStyle = focusedDescriptor.options.tabBarStyle as { display?: string } | undefined;
  
  // Hide tab bar if display is 'none'
  if (tabBarStyle?.display === 'none') {
    return null;
  }

  // Tab order comes from MainNavigator: Home, Calendar, People (Friends), Settings
  return (
    <View style={styles.container}>
      <BlurView intensity={85} tint="light" style={styles.blurContainer}>
        <View style={styles.tabBar}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const { filled, outline } = getIconNames(route.name);
            const label =
              typeof options.tabBarLabel === 'string' ? options.tabBarLabel : route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TabButton
                key={route.key}
                isFocused={isFocused}
                label={label}
                iconName={filled}
                iconNameOutline={outline}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 16,
    left: spacing.xxl,
    right: spacing.xxl,
    ...shadow.float,
  },
  blurContainer: {
    borderRadius: radius.xxxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
});
