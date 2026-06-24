import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import FriendsListScreen from '../screens/friends/FriendsListScreen';
import AddFriendScreen from '../screens/friends/AddFriendScreen';
import FriendProfileScreen from '../screens/friends/FriendProfileScreen';
import SyncContactsScreen from '../screens/friends/SyncContactsScreen';

import type { FriendsStackParamList } from '../types';
import { colors } from '../styles/theme';

const Stack = createStackNavigator<FriendsStackParamList>();

export default function FriendsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          color: colors.textPrimary,
        },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen 
        name="FriendsList" 
        component={FriendsListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AddFriend" 
        component={AddFriendScreen}
        options={({ navigation }) => ({
          headerTitle: 'Add Contact',
          headerShown: false,
        })}
      />
      <Stack.Screen
        name="FriendProfile"
        component={FriendProfileScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="SyncContacts" 
        component={SyncContactsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
