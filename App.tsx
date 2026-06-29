import React, { useEffect } from 'react';
import { Text, TextInput, AppState } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { store } from './src/store/store';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { configureNotificationHandler, rescheduleNotifications } from './src/utils/notifications';
import type { MainTabParamList } from './src/types';

// Lets us navigate from a notification tap, outside the React tree.
const navigationRef = createNavigationContainerRef<MainTabParamList>();

// Configure how notifications display while the app is foregrounded (once).
configureNotificationHandler();

// Opens the tapped contact's profile (Friends tab → FriendProfile).
function navigateToContact(contactId?: string): void {
  if (!contactId || !navigationRef.isReady()) return;
  navigationRef.navigate('Friends', { screen: 'FriendProfile', params: { contactId } });
}

function extractContactId(response: Notifications.NotificationResponse | null): string | undefined {
  return (response?.notification.request.content.data as { contactId?: string } | undefined)?.contactId;
}

// Base font for any Text/TextInput that doesn't set its own family via the
// theme typography tokens. Weighted styles still override this.
const baseFontStyle = { fontFamily: 'PlusJakartaSans_400Regular' };
const TextWithDefault = Text as unknown as { defaultProps?: { style?: unknown } };
TextWithDefault.defaultProps = TextWithDefault.defaultProps ?? {};
TextWithDefault.defaultProps.style = [baseFontStyle, TextWithDefault.defaultProps.style];
const InputWithDefault = TextInput as unknown as { defaultProps?: { style?: unknown } };
InputWithDefault.defaultProps = InputWithDefault.defaultProps ?? {};
InputWithDefault.defaultProps.style = [baseFontStyle, InputWithDefault.defaultProps.style];

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Keep the notification queue in sync with live data on every foreground.
  useEffect(() => {
    rescheduleNotifications();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') rescheduleNotifications();
    });
    return () => sub.remove();
  }, []);

  // Handle taps on notifications while the app is running.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      navigateToContact(extractContactId(response));
    });
    return () => sub.remove();
  }, []);

  // When the app was cold-launched by tapping a notification, route once nav is ready.
  const handleNavReady = () => {
    Notifications.getLastNotificationResponseAsync().then(response => {
      navigateToContact(extractContactId(response));
    });
  };

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <SafeAreaProvider>
          <NavigationContainer ref={navigationRef} onReady={handleNavReady}>
            <RootNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </SafeAreaProvider>
      </Provider>
    </ErrorBoundary>
  );
}
