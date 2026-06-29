import React, { useCallback, useState } from 'react';
import {
  View, StyleSheet, ScrollView, RefreshControl, Alert, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import type { MainTabParamList, Contact } from '../../types';
import { colors, spacing } from '../../styles/theme';
import { updateContact } from '../../utils/contactsStorage';
import { rescheduleNotifications } from '../../utils/notifications';
import { Snackbar } from '../../components';
import { useLocalConnectionSuggestions } from './useConnectionSuggestions';
import { fullName, markContactedToday } from './homeUtils';
import type { ConnectionSuggestion, UndoState } from './homeTypes';
import { HomeHeader } from './components/HomeHeader';
import { HeroCard } from './components/HeroCard';
import { HeroMetaBar } from './components/HeroMetaBar';
import { FriendHighlights } from './components/FriendHighlights';
import { PeopleWithEventsTile } from './components/PeopleWithEventsTile';
import { PeopleWithEventsModal } from './components/PeopleWithEventsModal';
import { HomeEmptyState } from './components/HomeEmptyState';
import { SuggestionDetailModal } from './components/SuggestionDetailModal';

// Clears the FloatingTabBar (bottom 28 + height 68) plus a gap
const SNACKBAR_BOTTOM_OFFSET = 96 + spacing.md;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const {
    loading, topSuggestion, refresh, generateNewSuggestion, reloadData, restoreSuggestion,
    allContacts, events, peopleWithEvents, setHeroContact, weeklyGoal,
  } = useLocalConnectionSuggestions();

  const [refreshing, setRefreshing] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [peopleVisible, setPeopleVisible] = useState(false);
  const [selected, setSelected] = useState<ConnectionSuggestion | undefined>();
  const [undo, setUndo] = useState<UndoState | null>(null);

  // Reload contacts/events on focus so edits show up — without re-rolling the suggestion.
  useFocusEffect(useCallback(() => { reloadData(); }, [reloadData]));

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

  // Marks the contact and arms the undo snackbar with a snapshot of the pre-mark state.
  const recordContact = useCallback(async (contact: Contact) => {
    const snapshot: UndoState = {
      message: `${fullName(contact)} marked as contacted`,
      contact: { ...contact },
      suggestion: topSuggestion?.friendId === contact.id ? topSuggestion : undefined,
    };
    await markContactedToday(contact);
    setUndo(snapshot);
    // Contact is no longer due — rebuild the queue so a stale nudge can't fire.
    rescheduleNotifications();
  }, [topSuggestion]);

  const handleUndo = useCallback(async () => {
    if (!undo) return;
    setUndo(null);
    try {
      await updateContact(undo.contact);
      if (undo.suggestion) {
        restoreSuggestion(undo.suggestion, undo.contact);
      } else {
        await refresh();
      }
      // Restoring may make the contact due again — resync notifications.
      rescheduleNotifications();
    } catch {
      Alert.alert('Something went wrong undoing the change.');
    }
  }, [undo, restoreSuggestion, refresh]);

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
      await recordContact(contact);
      await Linking.openURL(url);
      await refresh();
    } catch {
      Alert.alert('Something went wrong starting the call.');
    } finally {
      if (closeModal) setDetailVisible(false);
    }
  }, [getContact, recordContact, refresh]);

  const performMessage = useCallback(async (contactId: string, closeModal = false) => {
    try {
      const contact = getContact(contactId);
      if (!contact?.phone) {
        Alert.alert('No phone number', 'Cannot send a message without a phone number.');
        return;
      }
      const url = `sms:${contact.phone}`;
      if (!await Linking.canOpenURL(url)) { Alert.alert('Cannot send a message on this device'); return; }
      await recordContact(contact);
      await Linking.openURL(url);
      await refresh();
    } catch {
      Alert.alert('Something went wrong sending the message.');
    } finally {
      if (closeModal) setDetailVisible(false);
    }
  }, [getContact, recordContact, refresh]);

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
      await recordContact(contact);
      await Linking.openURL(url);
      await refresh();
    } catch {
      Alert.alert('Something went wrong starting FaceTime.');
    } finally {
      if (closeModal) setDetailVisible(false);
    }
  }, [getContact, recordContact, refresh]);

  const performMarkContacted = useCallback(async (contactId: string, closeModal = false) => {
    try {
      const contact = getContact(contactId);
      if (!contact) { Alert.alert('Contact not found'); return; }
      await recordContact(contact);
      if (closeModal) setDetailVisible(false);
      await refresh();
    } catch {
      Alert.alert('Something went wrong updating the contact.');
    }
  }, [getContact, recordContact, refresh]);

  const openDetail = useCallback((s: ConnectionSuggestion) => {
    setSelected(s);
    setDetailVisible(true);
  }, []);

  const handleShuffle = useCallback(async () => {
    setDetailVisible(false);
    await generateNewSuggestion();
  }, [generateNewSuggestion]);

  const heroContact = topSuggestion ? getContact(topSuggestion.friendId) : undefined;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <HomeHeader weeklyGoal={weeklyGoal} />

          {allContacts.length > 0 && topSuggestion ? (
            <>
              <HeroCard
                suggestion={topSuggestion}
                onPress={() => openDetail(topSuggestion)}
                onCall={() => performCall(topSuggestion.friendId)}
                onContactedRecently={() => performMarkContacted(topSuggestion.friendId)}
                onShuffle={generateNewSuggestion}
              />
              <HeroMetaBar
                lastContactedISO={topSuggestion.meta?.lastContactedISO}
                onMore={() => openDetail(topSuggestion)}
              />
              {heroContact && <FriendHighlights contact={heroContact} events={events} />}
              <PeopleWithEventsTile people={peopleWithEvents} onPress={() => setPeopleVisible(true)} />
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

      <PeopleWithEventsModal
        visible={peopleVisible}
        people={peopleWithEvents}
        events={events}
        onSelect={(id) => { setHeroContact(id); setPeopleVisible(false); }}
        onDismiss={() => setPeopleVisible(false)}
      />

      <Snackbar
        visible={undo !== null}
        message={undo?.message ?? ''}
        actionLabel="Undo"
        onAction={handleUndo}
        bottomOffset={SNACKBAR_BOTTOM_OFFSET}
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
