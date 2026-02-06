// src/screens/home/HomeScreen.tsx
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Linking,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../types';

import {
  colors,
  gradients,
  spacing,
  radius,
  typography,
  shadow,
} from '../../styles/theme';
import {
  GradientButton,
  FriendCard,
} from '../../components';

// --- Canonical types & storage utils ---
import type { Contact, ContactFrequency } from '../../types';
import { loadContacts, updateContact } from '../../utils/contactsStorage';
import {
  CONTACT_FREQUENCY_CONFIG,
  DEFAULT_CONTACT_FREQUENCY,
} from '../../constants/contactFrequency';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------- Minimal local types ----------
type FrequencyKey = ContactFrequency;

type User = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImage?: string;
};

type ConnectionReason =
  | { type?: 'upcoming_event' | 'last_contact' | 'cadence'; description: string };

type ConnectionSuggestion = {
  id: string;
  friendId: string;
  friend: User;
  score: number;
  reasons: ConnectionReason[];
  suggestedAt: string;
  dismissed?: boolean;
  meta?: {
    lastContactedISO?: string | null;
    frequency?: FrequencyKey;
    birthday?: string | null;
    notes?: string | null;
  };
};

// ---------- Cadence weighting (flattened for more variety) ----------
// Base scores are compressed to allow randomness to surface different cadences
// Spread is only 15 points (45-30) so jitter can easily overcome it
const FREQUENCY_BASE_SCORE: Record<FrequencyKey, number> = {
  weekly: 45,
  biweekly: 42,
  monthly: 38,
  quarterly: 35,
  biannual: 32,
  annually: 30,
};

// Urgency multipliers - affects how fast overdue contacts rise in priority
// Kept moderate so urgency doesn't completely override variety
const FREQUENCY_URGENCY_MULTIPLIER: Record<FrequencyKey, number> = {
  weekly: 1.2,
  biweekly: 1.1,
  monthly: 1.0,
  quarterly: 0.9,
  biannual: 0.8,
  annually: 0.7,
};

// ---------- Weighted Random Selection Helper ----------
// Picks from candidates where higher scores = higher probability (not guaranteed)
const weightedRandomSelect = <T extends { score: number }>(
  items: T[],
  count: number = 1
): T[] => {
  if (items.length === 0) return [];
  if (items.length <= count) return items;

  const selected: T[] = [];
  const remaining = [...items];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    // Normalize scores to positive values for weighting
    const minScore = Math.min(...remaining.map((item) => item.score));
    const weights = remaining.map((item) => Math.max(item.score - minScore + 10, 1));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // Pick a random point in the total weight
    let random = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let j = 0; j < weights.length; j++) {
      random -= weights[j];
      if (random <= 0) {
        selectedIndex = j;
        break;
      }
    }

    selected.push(remaining[selectedIndex]);
    remaining.splice(selectedIndex, 1);
  }

  return selected;
};

// ---------- Helpers ----------
const daysSince = (dateIso?: string | null) => {
  if (!dateIso) return 999;
  const t = new Date(dateIso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - t) / (1000 * 60 * 60 * 24)));
};

const formatLastContacted = (iso?: string | null) => {
  if (!iso) return 'Not recorded';
  const d = daysSince(iso);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  return `${d} days ago`;
};

const formatBirthday = (iso?: string | null) => {
  if (!iso) return null;
  // Parse the date as local time to avoid timezone issues
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
};

const getDaysUntilBirthday = (iso?: string | null) => {
  if (!iso) return null;
  const today = new Date();
  // Parse the date as local time to avoid timezone issues
  const birthday = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(birthday.getTime())) return null;
  
  // Set birthday to this year
  birthday.setFullYear(today.getFullYear());
  
  // If birthday has passed this year, use next year
  if (birthday < today) {
    birthday.setFullYear(today.getFullYear() + 1);
  }
  
  const diffTime = birthday.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

const fullName = (c: { firstName?: string; lastName?: string; username?: string }) =>
  [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.username || 'Friend';

const asUser = (c: Contact): User => ({
  id: c.id,
  firstName: c.firstName || '',
  lastName: c.lastName || '',
  username: (c.firstName || 'friend').toLowerCase(),
  profileImage: c.profileImage,
});

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatDate = () => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

// Helper to mark a contact as contacted today
const markContactAsContactedToday = async (contactId: string): Promise<Contact | null> => {
  try {
    const contacts: Contact[] = await loadContacts();
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return null;

    const nowIso = new Date().toISOString();
    const updated: Contact = {
      ...contact,
      lastContacted: nowIso,
      lastContactedCount: 'Today',
    };

    await updateContact(updated);
    return updated;
  } catch (e) {
    console.error('Error marking contact as contacted:', e);
    return null;
  }
};

// ===================================================================================
/**
 * useLocalConnectionSuggestions
 * Computes suggestions entirely on-device from locally stored contacts.
 */
// ===================================================================================
function useLocalConnectionSuggestions() {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Track the last suggested friend ID to avoid suggesting the same person twice in a row
  const lastSuggestedFriendIdRef = useRef<string | null>(null);

  const scoreContact = useCallback((c: Contact) => {
    const frequency = c.contactFrequency ?? DEFAULT_CONTACT_FREQUENCY;
    const config = CONTACT_FREQUENCY_CONFIG[frequency];
    const baseScore = FREQUENCY_BASE_SCORE[frequency];
    const urgencyScale = FREQUENCY_URGENCY_MULTIPLIER[frequency];
    const ds = daysSince(c.lastContacted);
    const cadence = config.days;
    const ratio = cadence ? ds / cadence : 0;

    // Approaching boost - slight increase as due date nears (reduced from 20 to 12)
    const approachingBoost = ratio < 1 ? ratio * 12 * urgencyScale : 0;
    
    // Overdue boost - increases when past due, but capped and moderated (reduced from 35 to 20)
    const overdueBoost = ratio >= 1 ? Math.min(ratio - 1, 1.5) * 20 * urgencyScale : 0;
    
    // Freshness penalty - recently contacted get slight penalty (reduced from -10 to -5)
    const freshnessPenalty = ratio < 0.3 ? -5 * (1 - ratio / 0.3) : 0;
    
    // Large jitter for variety - this is the key to mixing cadences (increased from 8 to 30)
    const jitter = Math.random() * 30;

    return baseScore + approachingBoost + overdueBoost + freshnessPenalty + jitter;
  }, []);


  const compute = useCallback(async () => {
    setLoading(true);
    try {
      const contacts: Contact[] = await loadContacts();
      setAllContacts(contacts);
      
      const enriched: ConnectionSuggestion[] = contacts.map((c) => {
        const score = scoreContact(c);
        const frequency = c.contactFrequency ?? DEFAULT_CONTACT_FREQUENCY;
        return {
          id: `local-${c.id}-${Math.random().toString(36).slice(2, 7)}`,
          friendId: c.id,
          friend: asUser(c),
          score,
          reasons: [
            { type: 'cadence', description: `Cadence: ${CONTACT_FREQUENCY_CONFIG[frequency].label}` },
            c.lastContacted
              ? { description: `Last chatted ${daysSince(c.lastContacted)} days ago` }
              : { description: 'No recent contact recorded' },
          ],
          suggestedAt: new Date().toISOString(),
          meta: {
            lastContactedISO: c.lastContacted ?? null,
            frequency,
            birthday: c.birthday ?? null,
            notes: c.notes ?? null,
          },
        };
      });

      // Use weighted random selection instead of strict sorting
      // This ensures variety while still favoring higher-scored contacts
      // First, sort to get a pool of reasonable candidates
      enriched.sort((a, b) => b.score - a.score);
      
      // Take top 15 as candidate pool, then weighted-randomly select 10
      let candidatePool = enriched.slice(0, Math.min(15, enriched.length));
      
      // Exclude the last suggested friend from being top suggestion again
      // (unless there's only 1 contact in the list)
      const lastId = lastSuggestedFriendIdRef.current;
      if (lastId && candidatePool.length > 1) {
        // Remove the last suggested friend from consideration for top spot
        candidatePool = candidatePool.filter((s) => s.friendId !== lastId);
      }
      
      const selectedSuggestions = weightedRandomSelect(candidatePool, 10);
      
      // Re-sort selected by score for display order
      selectedSuggestions.sort((a, b) => b.score - a.score);
      
      // Update the last suggested friend ID
      if (selectedSuggestions.length > 0) {
        lastSuggestedFriendIdRef.current = selectedSuggestions[0].friendId;
      }
      
      setSuggestions(selectedSuggestions);
    } catch (e) {
      console.error(e);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [scoreContact]);

  useEffect(() => {
    compute();
  }, [compute]);

  const generateNewSuggestion = useCallback(async () => {
    await compute();
  }, [compute]);

  const topSuggestion = useMemo(
    () => (suggestions.length ? suggestions[0] : undefined),
    [suggestions]
  );

  return {
    loading,
    suggestions,
    topSuggestion,
    refresh: compute,
    generateNewSuggestion,
    allContacts,
  };
}

// ===================================================================================
// HomeScreen
// ===================================================================================
const HomeScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const navigateToAddFriend = useCallback(() => {
    navigation.navigate('Friends', { screen: 'AddFriend' } as any);
  }, [navigation]);
  
  const {
    loading,
    suggestions,
    topSuggestion,
    refresh,
    generateNewSuggestion,
    allContacts,
  } = useLocalConnectionSuggestions();

  const [refreshing, setRefreshing] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selected, setSelected] = useState<ConnectionSuggestion | undefined>();

  // Refresh data when screen comes into focus (e.g., after adding a new contact)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const openSuggestionDetail = useCallback((s: ConnectionSuggestion) => {
    setSelected(s);
    setDetailVisible(true);
  }, []);

  // Helper to perform call action for a given contact ID
  const performCall = useCallback(async (contactId: string, closeModal = false) => {
    try {
      const contacts: Contact[] = await loadContacts();
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) {
        Alert.alert('Contact not found');
        return;
      }
      if (!contact.phone) {
        Alert.alert('No phone number', `${fullName(contact)} has no phone on file.`);
        return;
      }

      const phoneUrl = `tel:${contact.phone}`;
      const supported = await Linking.canOpenURL(phoneUrl);

      if (!supported) {
        Alert.alert('Cannot start a call on this device');
        return;
      }

      // Mark as contacted today
      await markContactAsContactedToday(contactId);
      await Linking.openURL(phoneUrl);
    } catch (e) {
      console.error(e);
      Alert.alert('Something went wrong starting the call.');
    } finally {
      if (closeModal) setDetailVisible(false);
    }
  }, []);

  // Helper to perform message action for a given contact ID
  const performMessage = useCallback(async (contactId: string, closeModal = false) => {
    try {
      const contacts: Contact[] = await loadContacts();
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact?.phone) {
        Alert.alert('No phone number', 'Cannot send a message without a phone number.');
        return;
      }

      // Mark as contacted today
      await markContactAsContactedToday(contactId);

      const smsUrl = `sms:${contact.phone}`;
      const supported = await Linking.canOpenURL(smsUrl);

      if (!supported) {
        Alert.alert('Cannot send a message on this device');
        return;
      }

      // Update last contacted date when messaging
      const nowIso = new Date().toISOString();
      const updated: Contact = {
        ...contact,
        lastContacted: nowIso,
        lastContactedCount: 'Today',
      };

      await updateContact(updated);
      await Linking.openURL(smsUrl);
    } catch (e) {
      console.error(e);
      Alert.alert('Something went wrong sending the message.');
    } finally {
      if (closeModal) setDetailVisible(false);
    }
  }, []);

  // Card action handlers (use topSuggestion)
  const handleCardCall = useCallback(async () => {
    if (!topSuggestion) return;
    await performCall(topSuggestion.friendId, false);
  }, [topSuggestion, performCall]);

  const handleCardMessage = useCallback(async () => {
    if (!topSuggestion) return;
    await performMessage(topSuggestion.friendId, false);
  }, [topSuggestion, performMessage]);

  const handleContactedRecently = useCallback(async () => {
    if (!topSuggestion) return;
    const contactId = topSuggestion.friendId;

    try {
      const contacts: Contact[] = await loadContacts();
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) {
        Alert.alert('Contact not found');
        return;
      }

      const nowIso = new Date().toISOString();
      const updated: Contact = {
        ...contact,
        lastContacted: nowIso,
        lastContactedCount: 'Today',
      };

      await updateContact(updated);
      Alert.alert(
        'Contact Updated',
        `${fullName(contact)} has been marked as contacted today.`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Something went wrong updating the contact.');
    }
  }, [topSuggestion]);

  // Modal action handlers (use selected)
  const handleCallNow = useCallback(async () => {
    if (!selected) return;
    await performCall(selected.friendId, true);
  }, [selected, performCall]);

  const handleMessage = useCallback(async () => {
    if (!selected) return;
    await performMessage(selected.friendId, true);
  }, [selected, performMessage]);

  const handleFaceTimeFromModal = useCallback(async () => {
    if (!selected) return;
    const contactId = selected.friendId;

    try {
      const contacts: Contact[] = await loadContacts();
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact?.phone) {
        Alert.alert('No phone number', 'Cannot start FaceTime without a phone number.');
        return;
      }

      const facetimeUrl = Platform.OS === 'ios' 
        ? `facetime:${contact.phone}`
        : `tel:${contact.phone}`;

      const supported = await Linking.canOpenURL(facetimeUrl);

      if (!supported) {
        if (Platform.OS === 'ios') {
          Alert.alert('Cannot start FaceTime', 'FaceTime is not available on this device.');
        } else {
          Alert.alert('FaceTime not available', 'FaceTime is only available on iOS devices.');
        }
        return;
      }

      // Mark as contacted today
      await markContactAsContactedToday(contactId);
      await Linking.openURL(facetimeUrl);
    } catch (e) {
      console.error(e);
      Alert.alert('Something went wrong starting FaceTime.');
    } finally {
      setDetailVisible(false);
    }
  }, [selected]);

  const handleContactedRecentlyFromModal = useCallback(async () => {
    if (!selected) return;
    const contactId = selected.friendId;

    try {
      const contacts: Contact[] = await loadContacts();
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) {
        Alert.alert('Contact not found');
        return;
      }

      await markContactAsContactedToday(contactId);
      
      Alert.alert(
        'Contact Updated',
        `${fullName(contact)} has been marked as contacted today.`,
        [{ text: 'OK' }]
      );
      setDetailVisible(false);
      await refresh();
    } catch (e) {
      console.error(e);
      Alert.alert('Something went wrong updating the contact.');
    }
  }, [selected, refresh]);


  // ---------- Render Functions ----------
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.dateText}>{formatDate()}</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFeaturedCard = () => {
    if (!topSuggestion) return null;

    const name = fullName(topSuggestion.friend);
    const lastText = formatLastContacted(topSuggestion.meta?.lastContactedISO);
    const cadence = topSuggestion.meta?.frequency ?? DEFAULT_CONTACT_FREQUENCY;
    const cadenceLabel = CONTACT_FREQUENCY_CONFIG[cadence].shortLabel;

    return (
      <View style={styles.featuredSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Suggested Connection</Text>
          <TouchableOpacity onPress={generateNewSuggestion} style={styles.shuffleBtn}>
            <Ionicons name="shuffle" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <FriendCard
          name={name}
          imageUri={topSuggestion.friend.profileImage}
          lastContactedText={lastText}
          cadenceLabel={cadenceLabel}
          onPress={() => openSuggestionDetail(topSuggestion)}
          onCall={handleCardCall}
          onMessage={handleCardMessage}
          onSnooze={() => generateNewSuggestion()}
          onContactedRecently={handleContactedRecently}
        />
      </View>
    );
  };

  // About This Friend section showing details about the suggested contact
  const renderAboutFriend = () => {
    if (!topSuggestion) return null;

    const name = topSuggestion.friend.firstName || 'this friend';
    const frequency = topSuggestion.meta?.frequency ?? DEFAULT_CONTACT_FREQUENCY;
    const frequencyConfig = CONTACT_FREQUENCY_CONFIG[frequency];
    const lastContactedDays = daysSince(topSuggestion.meta?.lastContactedISO);
    const birthday = topSuggestion.meta?.birthday;
    const formattedBirthday = formatBirthday(birthday);
    const daysUntilBirthday = getDaysUntilBirthday(birthday);
    const notes = topSuggestion.meta?.notes;

    // Calculate status
    const daysRemaining = frequencyConfig.days - lastContactedDays;
    const statusText = daysRemaining <= 0
      ? `Check-in recommended`
      : `${daysRemaining} days until next check-in`;

    return (
      <View style={styles.aboutSection}>
        
        <View style={styles.aboutCard}>
          {/* Last Contacted */}
          <View style={styles.aboutRow}>
            <View style={[styles.aboutIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutLabel}>Last Contacted</Text>
              <Text style={styles.aboutValue}>
                {topSuggestion.meta?.lastContactedISO 
                  ? formatLastContacted(topSuggestion.meta?.lastContactedISO)
                  : 'Never contacted'}
              </Text>
            </View>
          </View>

          {/* Contact Cadence */}
          <View style={styles.aboutRow}>
            <View style={[styles.aboutIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="repeat-outline" size={18} color={colors.accent} />
            </View>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutLabel}>Contact Cadence</Text>
              <Text style={styles.aboutValue}>{frequencyConfig.label}</Text>
            </View>
          </View>

          {/* Status */}
          <View style={styles.aboutRow}>
            <View style={[
              styles.aboutIcon, 
              { backgroundColor: daysRemaining <= 0 ? colors.warningSoft : colors.successSoft }
            ]}>
              <Ionicons 
                name={daysRemaining <= 0 ? "calendar-outline" : "checkmark-circle-outline"} 
                size={18} 
                color={daysRemaining <= 0 ? colors.warning : colors.success} 
              />
            </View>
            <View style={styles.aboutContent}>
              <Text style={styles.aboutLabel}>Status</Text>
              <Text style={[
                styles.aboutValue,
                { color: daysRemaining <= 0 ? colors.warning : colors.success }
              ]}>
                {statusText}
              </Text>
            </View>
          </View>

          {/* Birthday (if available) */}
          {formattedBirthday && (
            <View style={styles.aboutRow}>
              <View style={[styles.aboutIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="gift-outline" size={18} color={colors.accent} />
              </View>
              <View style={styles.aboutContent}>
                <Text style={styles.aboutLabel}>Birthday</Text>
                <Text style={styles.aboutValue}>
                  {formattedBirthday}
                  {daysUntilBirthday !== null && daysUntilBirthday <= 30 && (
                    <Text style={{ color: colors.accent }}> ({daysUntilBirthday} days away)</Text>
                  )}
                </Text>
              </View>
            </View>
          )}

          {/* Notes (if available) */}
          {notes && (
            <View style={styles.aboutRow}>
              <View style={[styles.aboutIcon, { backgroundColor: colors.surfaceMuted }]}>
                <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
              </View>
              <View style={styles.aboutContent}>
                <Text style={styles.aboutLabel}>Notes</Text>
                <Text style={styles.aboutValue} numberOfLines={2}>{notes}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyIconGradient}
        >
          <Ionicons name="people" size={48} color={colors.textLight} />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>No friends yet</Text>
      <Text style={styles.emptyText}>
        Start building your network by adding your first contact!
      </Text>
      <GradientButton
        title="Add Your First Contact"
        icon="person-add"
        onPress={navigateToAddFriend}
        size="lg"
      />
    </View>
  );

  const renderDetailModal = () => (
    <Modal
      visible={detailVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setDetailVisible(false)}
    >
      <View style={styles.modalBackdrop}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={styles.modalCard}>
          {selected && (
            <>
              {/* Profile Image */}
              <View style={styles.modalImageContainer}>
                <LinearGradient
                  colors={[...gradients.storyRing]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modalImageRing}
                >
                  <View style={styles.modalImageInner}>
                    <Image
                      source={{
                        uri: selected.friend.profileImage || 'https://via.placeholder.com/160',
                      }}
                      style={styles.modalImage}
                    />
                  </View>
                </LinearGradient>
              </View>

              {/* Name & Info */}
              <Text style={styles.modalName}>{fullName(selected.friend)}</Text>
              <Text style={styles.modalReasons}>
                {selected.reasons.map((r) => r.description).join(' • ')}
              </Text>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <GradientButton
                  title="Call Now"
                  icon="call"
                  onPress={handleCallNow}
                  fullWidth
                />
                <GradientButton
                  title="Send Message"
                  icon="chatbubble"
                  variant="outline"
                  onPress={handleMessage}
                  fullWidth
                />
                {Platform.OS === 'ios' && (
                  <GradientButton
                    title="FaceTime"
                    icon="videocam"
                    variant="outline"
                    onPress={handleFaceTimeFromModal}
                    fullWidth
                  />
                )}
                <GradientButton
                  title="Contacted Recently"
                  icon="checkmark-circle-outline"
                  variant="outline"
                  onPress={handleContactedRecentlyFromModal}
                  fullWidth
                />
                <TouchableOpacity
                  style={styles.shuffleAction}
                  onPress={async () => {
                    await generateNewSuggestion();
                    setDetailVisible(false);
                  }}
                >
                  <Ionicons name="shuffle" size={20} color={colors.primary} />
                  <Text style={styles.shuffleText}>Try Someone Else</Text>
                </TouchableOpacity>
              </View>

              {/* Dismiss */}
              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={() => setDetailVisible(false)}
              >
                <Text style={styles.dismissBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

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
          {renderHeader()}
          
          {allContacts.length > 0 ? (
            <>
              {renderFeaturedCard()}
              {renderAboutFriend()}
            </>
          ) : (
            renderEmptyState()
          )}
          
          {/* Bottom padding for tab bar */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      {renderDetailModal()}
    </View>
  );
};

export default HomeScreen;

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },

  // Header
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  dateText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },

  // Section common
  sectionTitle: {
    ...typography.sectionTitle,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  shuffleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Featured section
  featuredSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },

  // About section
  aboutSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
  },
  aboutCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.sm,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  aboutIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  aboutContent: {
    flex: 1,
  },
  aboutLabel: {
    ...typography.caption,
    marginBottom: spacing.xxs,
  },
  aboutValue: {
    ...typography.label,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.xxxxl,
  },
  emptyIconContainer: {
    marginBottom: spacing.xxl,
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  emptyTitle: {
    ...typography.heading,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxxl,
    borderTopRightRadius: radius.xxxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxxl,
    ...shadow.float,
  },
  modalImageContainer: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalImageRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.placeholder,
  },
  modalName: {
    ...typography.heading,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalReasons: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  modalActions: {
    gap: spacing.md,
  },
  shuffleAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  shuffleText: {
    ...typography.buttonSecondary,
  },
  dismissBtn: {
    paddingVertical: spacing.md,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  dismissBtnText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '600',
  },

  // Bottom padding
  bottomPadding: {
    height: 100,
  },
});
