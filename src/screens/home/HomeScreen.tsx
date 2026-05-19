import React, { useCallback, useState } from 'react';
import {
  View, StyleSheet, ScrollView, RefreshControl, Alert, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import type { MainTabParamList, Contact } from '../../types';
import { colors, gradients, spacing } from '../../styles/theme';
import { useLocalConnectionSuggestions } from './useConnectionSuggestions';
import { fullName, markContactedToday } from './homeUtils';
import type { ConnectionSuggestion } from './homeTypes';
import { HomeHeader } from './components/HomeHeader';
import { FeaturedCardSection } from './components/FeaturedCardSection';
import { AboutFriend } from './components/AboutFriend';
import { HomeEmptyState } from './components/HomeEmptyState';
import { SuggestionDetailModal } from './components/SuggestionDetailModal';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { loading, topSuggestion, refresh, generateNewSuggestion, allContacts } =
    useLocalConnectionSuggestions();

  const [refreshing, setRefreshing] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selected, setSelected] = useState<ConnectionSuggestion | undefined>();

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const navigateToAddFriend = useCallback(() => {
    navigation.navigate('Friends', { screen: 'AddFriend' } as any);
  }, [navigation]);

  // H9: look up contact from already-loaded allContacts — no AsyncStorage read on each tap
  const getContact = useCallback(
    (id: string): Contact | undefined => allContacts.find(c => c.id === id),
    [allContacts],
  );

  const performCall = useCallback(async (contactId: string, closeModal = false) => {
    try {
      const contact = getContact(contactId);
      if (!contact) { Alert.alert('Contact not found'); return; }
      if (!contact.phone) {
        Alert.alert('No phone number', `${fullName(contact)} has no phone on file.`);
        return;
      }
      const url = `tel:${contact.phone}`;
      if (!await Linking.canOpenURL(url)) { Alert.alert('Cannot start a call on this device'); return; }
      await markContactedToday(contact);
      await Linking.openURL(url);
    } catch {
      Alert.alert('Something went wrong starting the call.');
    } finally {
      if (closeModal) setDetailVisible(false);
    }
  }, [getContact]);

  const performMessage = useCallback(async (contactId: string, closeModal = false) => {
    try {
      const contact = getContact(contactId);
      if (!contact?.phone) {
        Alert.alert('No phone number', 'Cannot send a message without a phone number.');
        return;
      }
      await markContactedToday(contact);
      const url = `sms:${contact.phone}`;
      if (!await Linking.canOpenURL(url)) { Alert.alert('Cannot send a message on this device'); return; }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Something went wrong sending the message.');
    } finally {
      if (closeModal) setDetailVisible(false);
    }
  }, [getContact]);

  const performFaceTime = useCallback(async (contactId: string, closeModal = false) => {
    try {
      const contact = getContact(contactId);
      if (!contact?.phone) {
        Alert.alert('No phone number', 'Cannot start FaceTime without a phone number.');
        return;
      }
      const url = Platform.OS === 'ios'
        ? `facetime:${contact.phone}`
        : `tel:${contact.phone}`;
      if (!await Linking.canOpenURL(url)) {
        Alert.alert('FaceTime not available', 'Cannot open FaceTime on this device.');
        return;
      }
      await markContactedToday(contact);
      await Linking.openURL(url);
    } catch {
      Alert.alert('Something went wrong starting FaceTime.');
    } finally {
      if (closeModal) setDetailVisible(false);
    }
  }, [getContact]);

  const performMarkContacted = useCallback(async (contactId: string, closeModal = false) => {
    try {
      const contact = getContact(contactId);
      if (!contact) { Alert.alert('Contact not found'); return; }
      await markContactedToday(contact);
      Alert.alert('Contact Updated', `${fullName(contact)} has been marked as contacted today.`);
      if (closeModal) {
        setDetailVisible(false);
        await refresh();
      }
    } catch {
      Alert.alert('Something went wrong updating the contact.');
    }
  }, [getContact, refresh]);

  const openDetail = useCallback((s: ConnectionSuggestion) => {
    setSelected(s);
    setDetailVisible(true);
  }, []);

  const handleShuffle = useCallback(async () => {
    setDetailVisible(false);
    await generateNewSuggestion();
  }, [generateNewSuggestion]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd] as const}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || loading}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <HomeHeader />

          {allContacts.length > 0 && topSuggestion ? (
            <>
              <FeaturedCardSection
                suggestion={topSuggestion}
                onShuffle={generateNewSuggestion}
                onPress={() => openDetail(topSuggestion)}
                onCall={() => performCall(topSuggestion.friendId)}
                onFaceTime={() => performFaceTime(topSuggestion.friendId)}
                onMessage={() => performMessage(topSuggestion.friendId)}
                onContactedRecently={() => performMarkContacted(topSuggestion.friendId)}
              />
              <AboutFriend suggestion={topSuggestion} />
            </>
          ) : (
            !loading && <HomeEmptyState onAddContact={navigateToAddFriend} />
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      <SuggestionDetailModal
        visible={detailVisible}
        suggestion={selected}
        onDismiss={() => setDetailVisible(false)}
        onCall={() => selected && performCall(selected.friendId, true)}
        onMessage={() => selected && performMessage(selected.friendId, true)}
        onFaceTime={() => selected && performFaceTime(selected.friendId, true)}
        onContactedRecently={() => selected && performMarkContacted(selected.friendId, true)}
        onShuffle={handleShuffle}
      />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxxl },
  bottomPadding: { height: 100 },
});
