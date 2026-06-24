import React from 'react';
import { Text, TextInput } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <SafeAreaProvider>
          <NavigationContainer>
            <RootNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </SafeAreaProvider>
      </Provider>
    </ErrorBoundary>
  );
}
