import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import HomeScreen from '../screens/home/HomeScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import FriendsNavigator from './FriendsNavigator';
import EventsScreen from '../screens/events/EventsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import { FloatingTabBar } from '../components';

import type { MainTabParamList } from '../types';
import { colors } from '../styles/theme';

// Screens where the tab bar should be hidden
const SCREENS_WITHOUT_TAB_BAR = ['SyncContacts', 'AddFriend', 'FriendProfile'];

// Helper to determine if tab bar should be shown
function getTabBarVisibility(route: RouteProp<MainTabParamList, 'Friends'>): boolean {
  const routeName = getFocusedRouteNameFromRoute(route) ?? 'FriendsList';
  return !SCREENS_WITHOUT_TAB_BAR.includes(routeName);
}

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  return (
    <View style={styles.container}>
      <Tab.Navigator
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Order: Friends, Calendar, Home (center), Events, Settings */}
        <Tab.Screen 
          name="Friends" 
          component={FriendsNavigator}
          options={({ route }) => ({
            tabBarStyle: getTabBarVisibility(route) ? undefined : { display: 'none' },
          })}
        />
        <Tab.Screen 
          name="Calendar" 
          component={CalendarScreen}
        />
        <Tab.Screen 
          name="Home" 
          component={HomeScreen}
        />
        <Tab.Screen 
          name="Events" 
          component={EventsScreen}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
