// src/screens/settings/SettingsScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Linking,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp, CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as ImagePicker from 'expo-image-picker';
import { resizeProfileImage } from '../../utils/imageUtils';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { MainTabParamList, FriendsStackParamList } from '../../types';

// Navigation type for Settings screen that can navigate to nested screens
type SettingsNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Settings'>,
  NavigationProp<FriendsStackParamList>
>;

import {
  colors,
  gradients,
  spacing,
  radius,
  typography,
  shadow,
  avatarSizes,
} from '../../styles/theme';
import { DayOfWeek, NotificationSettings } from '../../types';
import {
  loadNotificationSettings,
  saveNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../../utils/notificationSettings';
import {
  requestNotificationPermission,
  rescheduleNotifications,
  cancelAllNotifications,
  sendTestNotification,
} from '../../utils/notifications';
import {
  submitFeatureRequest,
  isFeatureRequestConfigured,
} from '../../utils/featureRequest';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  bio: string;
  location: string;
  birthday: string | null;
  profileImage?: string;
}

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightElement?: React.ReactNode;
}

function SettingsItem({ icon, title, subtitle, onPress, showArrow = true, rightElement }: SettingsItemProps) {
  return (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingsItemIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.settingsItemContent}>
        <Text style={styles.settingsItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement}
      {showArrow && !rightElement && (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

const DAYS_OF_WEEK: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'M' },
  { key: 'tuesday', label: 'Tuesday', short: 'T' },
  { key: 'wednesday', label: 'Wednesday', short: 'W' },
  { key: 'thursday', label: 'Thursday', short: 'T' },
  { key: 'friday', label: 'Friday', short: 'F' },
  { key: 'saturday', label: 'Saturday', short: 'S' },
  { key: 'sunday', label: 'Sunday', short: 'S' },
];

// Helper to parse time string "HH:MM" into Date
function parseTimeToDate(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Helper to format Date to "HH:MM"
function formatDateToTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Helper to format time for display (e.g., "9:00 AM")
function formatTimeDisplay(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Input sanitization helpers
// Names: Only letters, spaces, hyphens, and apostrophes
function sanitizeName(text: string): string {
  return text.replace(/[^a-zA-Z\s\-']/g, '');
}

// Username: Only lowercase alphanumeric, underscores, and periods
function sanitizeUsername(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9_\.]/g, '');
}

// Phone: Only digits, plus sign, hyphens, parentheses, and spaces
function sanitizePhone(text: string): string {
  return text.replace(/[^0-9\+\-\(\)\s]/g, '');
}

// Location: Letters, spaces, commas, and hyphens
function sanitizeLocation(text: string): string {
  return text.replace(/[^a-zA-Z\s,\-']/g, '');
}

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsNavigationProp>();
  // Profile state
  const [profile, setProfile] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    birthday: null,
    profileImage: undefined,
  });

  // Notification settings (local reminders)
  const [notif, setNotif] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  // Modal states
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);

  // Feature request form state
  const [featureMessage, setFeatureMessage] = useState('');
  const [featureName, setFeatureName] = useState('');
  const [featureSubmitting, setFeatureSubmitting] = useState(false);

  // Time picker states
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);

  // Temporary edit states
  const [editProfile, setEditProfile] = useState<Partial<ProfileFormData>>({});
  const [editNotif, setEditNotif] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem('@link_profile');
        if (storedProfile) {
          setProfile(prev => ({ ...prev, ...JSON.parse(storedProfile) }));
        }
        setNotif(await loadNotificationSettings());
      } catch {
        // settings stay at defaults if storage read fails
      }
    };
    loadSettings();
  }, []);

  // Open edit profile modal
  const handleEditProfile = useCallback(() => {
    setEditProfile({ ...profile });
    setShowEditProfileModal(true);
  }, [profile]);

  // Save profile changes
  const handleSaveProfile = useCallback(async () => {
    const updated = { ...profile, ...editProfile };
    setProfile(updated);
    setShowEditProfileModal(false);
    try {
      await AsyncStorage.setItem('@link_profile', JSON.stringify(updated));
    } catch {
      // data remains in state for this session
    }
  }, [editProfile, profile]);

  // Master notifications toggle. Turning on requests OS permission first; if the
  // user declines we leave it off and point them to device Settings.
  const handleToggleEnabled = useCallback(async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Notifications are off',
          'To get reminders, enable notifications for Link in your device Settings.',
        );
        return;
      }
    }
    const next = { ...notif, enabled: value };
    setNotif(next);
    await saveNotificationSettings(next);
    if (value) {
      await rescheduleNotifications();
    } else {
      await cancelAllNotifications();
    }
  }, [notif]);

  // Birthday reminders toggle.
  const handleToggleBirthdays = useCallback(async (value: boolean) => {
    const next = { ...notif, birthdaysEnabled: value };
    setNotif(next);
    await saveNotificationSettings(next);
    await rescheduleNotifications();
  }, [notif]);

  // Open schedule modal
  const handleEditSchedule = useCallback(() => {
    setEditNotif(notif);
    setShowNotifModal(true);
  }, [notif]);

  // Save schedule changes
  const handleSaveSchedule = useCallback(async () => {
    setNotif(editNotif);
    setShowNotifModal(false);
    await saveNotificationSettings(editNotif);
    await rescheduleNotifications();
  }, [editNotif]);

  // Open the feature request form. Prefill the name from the saved profile so
  // the user can keep or clear it — it's optional either way.
  const handleOpenFeatureRequest = useCallback(() => {
    setFeatureMessage('');
    setFeatureName(`${profile.firstName} ${profile.lastName}`.trim());
    setShowFeatureModal(true);
  }, [profile.firstName, profile.lastName]);

  // Submit a feature request / idea. Prefills name & email from the saved
  // profile so the team can follow up, then hands off to the Apps Script.
  const handleSubmitFeatureRequest = useCallback(async () => {
    const message = featureMessage.trim();
    if (!message) {
      Alert.alert('Add a few words', 'Tell us about the feature or idea you have in mind.');
      return;
    }
    setFeatureSubmitting(true);
    const result = await submitFeatureRequest({
      message,
      name: featureName,
      email: profile.email,
    });
    setFeatureSubmitting(false);

    if (result.ok) {
      setShowFeatureModal(false);
      setFeatureMessage('');
      setFeatureName('');
      Alert.alert('Thank you! 💜', 'Your idea has been sent. We read every single one.');
      return;
    }

    if (result.reason === 'not-configured') {
      Alert.alert(
        'Not available yet',
        'Feature requests aren’t set up in this build. Please try again after the next update.',
      );
    } else {
      Alert.alert(
        'Couldn’t send',
        'Something went wrong sending your idea. Please check your connection and try again.',
      );
    }
  }, [featureMessage, featureName, profile.email]);

  // Toggle a day in the schedule editor
  const toggleDay = useCallback((day: DayOfWeek) => {
    setEditNotif(prev => {
      const days = prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day];
      return { ...prev, days };
    });
  }, []);

  // Image picker - camera
  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setShowPhotoModal(false);
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const resized = await resizeProfileImage(result.assets[0].uri);
      const dir = `${FileSystem.documentDirectory}profile_images/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const dest = `${dir}user_profile_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: resized, to: dest });
      setProfile(prev => ({ ...prev, profileImage: dest }));
      setShowPhotoModal(false);
    }
  }, []);

  // Image picker - gallery
  const handleChooseFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setShowPhotoModal(false);
      Alert.alert('Permission Required', 'Photo library permission is required to choose photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const resized = await resizeProfileImage(result.assets[0].uri);
      const dir = `${FileSystem.documentDirectory}profile_images/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const dest = `${dir}user_profile_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: resized, to: dest });
      setProfile(prev => ({ ...prev, profileImage: dest }));
      setShowPhotoModal(false);
    }
  }, []);

  // Remove photo
  const handleRemovePhoto = useCallback(() => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setProfile(prev => ({ ...prev, profileImage: undefined }));
            setShowPhotoModal(false);
          },
        },
      ]
    );
  }, []);

  // Handle notification time picker change
  const handleTimeChange = useCallback((event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      setEditNotif(prev => ({ ...prev, time: formatDateToTime(date) }));
    }
  }, []);

  const handleBirthdayChange = useCallback((event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowBirthdayPicker(false);
    }
    if (date) {
      setEditProfile(prev => ({ ...prev, birthday: date.toISOString().split('T')[0] }));
    }
  }, []);

  // Get display name for profile subtitle
  const getProfileDisplayName = () => {
    if (profile.firstName || profile.lastName) {
      return `${profile.firstName} ${profile.lastName}`.trim();
    }
    return 'Add your information';
  };

  // Get notification schedule summary
  const getScheduleSummary = () => {
    if (!notif.enabled) return 'Off';
    const dayCount = notif.days.length;
    if (dayCount === 0) return `No days selected, ${formatTimeDisplay(notif.time)}`;
    return `${dayCount} ${dayCount === 1 ? 'day' : 'days'}, ${formatTimeDisplay(notif.time)}`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd] as const}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Customize your experience</Text>
          </View>

          {/* Profile Preview Card */}
          <View style={styles.profilePreview}>
            <TouchableOpacity
              style={styles.profileAvatarContainer}
              onPress={() => setShowPhotoModal(true)}
            >
              {profile.profileImage ? (
                <Image source={{ uri: profile.profileImage }} style={styles.profileAvatar} />
              ) : (
                <LinearGradient
                  colors={gradients.primary}
                  style={styles.profileAvatarPlaceholder}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="person" size={40} color={colors.textLight} />
                </LinearGradient>
              )}
              <View style={styles.editAvatarBadge}>
                <Ionicons name="camera" size={14} color={colors.textLight} />
              </View>
            </TouchableOpacity>
            <Text style={styles.profileName}>
              {profile.firstName || profile.lastName
                ? `${profile.firstName} ${profile.lastName}`.trim()
                : 'Your Name'}
            </Text>
            {profile.username && (
              <Text style={styles.profileUsername}>@{profile.username}</Text>
            )}
          </View>

          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROFILE</Text>
            <View style={styles.sectionCard}>
              <SettingsItem
                icon="person-outline"
                title="Edit Profile"
                subtitle={getProfileDisplayName()}
                onPress={handleEditProfile}
              />
              <View style={styles.divider} />
              <SettingsItem
                icon="image-outline"
                title="Profile Photo"
                subtitle={profile.profileImage ? 'Change your photo' : 'Add a photo'}
                onPress={() => setShowPhotoModal(true)}
              />
            </View>
          </View>

          {/* Contacts Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONTACTS</Text>
            <View style={styles.sectionCard}>
              <SettingsItem
                icon="sync-outline"
                title="Sync Contacts"
                subtitle="Import contacts from your phone"
                onPress={() => navigation.navigate('Friends', { screen: 'SyncContacts' })}
              />
            </View>
          </View>

          {/* Notifications Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
            <View style={styles.sectionCard}>
              <SettingsItem
                icon="notifications-outline"
                title="Reminders"
                subtitle="Gentle nudges to reach out"
                showArrow={false}
                rightElement={
                  <Switch
                    value={notif.enabled}
                    onValueChange={handleToggleEnabled}
                    trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
                  />
                }
              />
              <View style={styles.divider} />
              <SettingsItem
                icon="time-outline"
                title="Schedule"
                subtitle={getScheduleSummary()}
                onPress={handleEditSchedule}
              />
              <View style={styles.divider} />
              <SettingsItem
                icon="gift-outline"
                title="Birthday Reminders"
                subtitle="Morning-of birthday alerts"
                showArrow={false}
                rightElement={
                  <Switch
                    value={notif.birthdaysEnabled}
                    onValueChange={handleToggleBirthdays}
                    trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
                  />
                }
              />
            </View>
          </View>

          {/* Feedback Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FEEDBACK</Text>
            <View style={styles.sectionCard}>
              <SettingsItem
                icon="bulb-outline"
                title="Request a Feature"
                subtitle="Share an idea to make Link better"
                onPress={handleOpenFeatureRequest}
              />
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ABOUT</Text>
            <View style={styles.sectionCard}>
              <SettingsItem
                icon="information-circle-outline"
                title="About Link"
                subtitle="Version 1.0.0"
              />
              <View style={styles.divider} />
              <SettingsItem
                icon="document-text-outline"
                title="Privacy Policy"
                onPress={() => Linking.openURL('https://a6harris.github.io/Link/privacy.html')}
              />
              <View style={styles.divider} />
              <SettingsItem
                icon="shield-checkmark-outline"
                title="Terms of Service"
                onPress={() => Linking.openURL('https://a6harris.github.io/Link/privacy.html')}
              />
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Stay connected with the people who matter</Text>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfileModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditProfileModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={handleSaveProfile}>
                <Text style={styles.modalSave}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Basic Info */}
              <Text style={styles.formSectionTitle}>BASIC INFORMATION</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={editProfile.firstName}
                  onChangeText={(text) => setEditProfile(prev => ({ ...prev, firstName: sanitizeName(text) }))}
                  placeholder="Enter your first name"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={50}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={editProfile.lastName}
                  onChangeText={(text) => setEditProfile(prev => ({ ...prev, lastName: sanitizeName(text) }))}
                  placeholder="Enter your last name"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={50}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={editProfile.username}
                  onChangeText={(text) => setEditProfile(prev => ({ ...prev, username: sanitizeUsername(text) }))}
                  placeholder="letters, numbers, underscores only"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={30}
                />
              </View>

              {/* Contact Info */}
              <Text style={[styles.formSectionTitle, { marginTop: spacing.xl }]}>CONTACT INFORMATION</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={editProfile.email}
                  onChangeText={(text) => setEditProfile(prev => ({ ...prev, email: text.toLowerCase().trim() }))}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  maxLength={100}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={editProfile.phone}
                  onChangeText={(text) => setEditProfile(prev => ({ ...prev, phone: sanitizePhone(text) }))}
                  placeholder="+1 (555) 123-4567"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  maxLength={20}
                />
              </View>

              {/* Personal Details */}
              <Text style={[styles.formSectionTitle, { marginTop: spacing.xl }]}>PERSONAL DETAILS</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Birthday</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowBirthdayPicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  <Text style={editProfile.birthday ? styles.datePickerText : styles.datePickerPlaceholder}>
                    {editProfile.birthday
                      ? new Date(editProfile.birthday).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Select your birthday'}
                  </Text>
                </TouchableOpacity>
                {showBirthdayPicker && (
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerHeader}>
                      <Text style={styles.datePickerTitle}>Select Birthday</Text>
                      <TouchableOpacity 
                        onPress={() => setShowBirthdayPicker(false)}
                        style={styles.datePickerDone}
                      >
                        <Text style={styles.datePickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={editProfile.birthday ? new Date(editProfile.birthday) : new Date(2000, 0, 1)}
                      mode="date"
                      display="spinner"
                      onChange={handleBirthdayChange}
                      maximumDate={new Date()}
                      minimumDate={new Date(1900, 0, 1)}
                      style={styles.datePicker}
                      textColor={colors.textPrimary}
                    />
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={editProfile.location}
                  onChangeText={(text) => setEditProfile(prev => ({ ...prev, location: sanitizeLocation(text) }))}
                  placeholder="City, Country"
                  placeholderTextColor={colors.textMuted}
                  autoCorrect={false}
                  maxLength={100}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editProfile.bio}
                  onChangeText={(text) => setEditProfile(prev => ({ ...prev, bio: text }))}
                  placeholder="Tell us a bit about yourself..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={300}
                />
                <Text style={styles.charCount}>
                  {editProfile.bio?.length || 0}/300
                </Text>
              </View>

              <View style={{ height: spacing.xxxl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Photo Options Modal */}
      <Modal
        visible={showPhotoModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <TouchableOpacity
          style={styles.photoModalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoModal(false)}
        >
          <View style={styles.photoModalContent}>
            <View style={styles.photoModalHandle} />
            <Text style={styles.photoModalTitle}>Profile Photo</Text>

            {profile.profileImage && (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: profile.profileImage }} style={styles.photoPreview} />
              </View>
            )}

            <TouchableOpacity style={styles.photoOption} onPress={handleTakePhoto}>
              <View style={styles.photoOptionIcon}>
                <Ionicons name="camera" size={24} color={colors.primary} />
              </View>
              <Text style={styles.photoOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoOption} onPress={handleChooseFromGallery}>
              <View style={styles.photoOptionIcon}>
                <Ionicons name="images" size={24} color={colors.primary} />
              </View>
              <Text style={styles.photoOptionText}>Choose from Library</Text>
            </TouchableOpacity>

            {profile.profileImage && (
              <TouchableOpacity style={styles.photoOption} onPress={handleRemovePhoto}>
                <View style={[styles.photoOptionIcon, { backgroundColor: colors.dangerSoft }]}>
                  <Ionicons name="trash" size={24} color={colors.danger} />
                </View>
                <Text style={[styles.photoOptionText, { color: colors.danger }]}>Remove Photo</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.photoModalCancel}
              onPress={() => setShowPhotoModal(false)}
            >
              <Text style={styles.photoModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notification Schedule Modal */}
      <Modal
        visible={showNotifModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotifModal(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNotifModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Schedule</Text>
            <TouchableOpacity onPress={handleSaveSchedule}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.availabilityDescription}>
              Pick the days and time you'd like a gentle reminder to reach out. We only nudge you when someone's actually due — never just to pull you back in.
            </Text>

            {/* Time */}
            <Text style={styles.formSectionTitle}>REMINDER TIME</Text>

            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.timeButtonText}>
                {formatTimeDisplay(editNotif.time)}
              </Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={parseTimeToDate(editNotif.time)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                minuteInterval={15}
              />
            )}

            {/* Days of Week */}
            <Text style={[styles.formSectionTitle, { marginTop: spacing.xxl }]}>REMINDER DAYS</Text>

            <View style={styles.daysContainer}>
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = editNotif.days.includes(day.key);
                return (
                  <TouchableOpacity
                    key={day.key}
                    style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                    onPress={() => toggleDay(day.key)}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={gradients.primary}
                        style={styles.dayButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.dayButtonTextSelected}>{day.short}</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={styles.dayButtonText}>{day.short}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.daysLegend}>
              {DAYS_OF_WEEK.map((day) => (
                <Text
                  key={day.key}
                  style={[
                    styles.dayLegendText,
                    editNotif.days.includes(day.key) && styles.dayLegendTextSelected,
                  ]}
                >
                  {day.label.slice(0, 3)}
                </Text>
              ))}
            </View>

            {/* Quick Presets */}
            <Text style={[styles.formSectionTitle, { marginTop: spacing.xxl }]}>QUICK PRESETS</Text>
            
            <View style={styles.presetsContainer}>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => setEditNotif(prev => ({
                  ...prev,
                  days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                }))}
              >
                <Text style={styles.presetButtonText}>Weekdays Only</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => setEditNotif(prev => ({
                  ...prev,
                  days: ['saturday', 'sunday'],
                }))}
              >
                <Text style={styles.presetButtonText}>Weekends Only</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => setEditNotif(prev => ({
                  ...prev,
                  days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                }))}
              >
                <Text style={styles.presetButtonText}>Every Day</Text>
              </TouchableOpacity>
            </View>

            {/* Send a test so the user can confirm delivery */}
            <TouchableOpacity
              style={styles.testButton}
              onPress={sendTestNotification}
            >
              <Ionicons name="paper-plane-outline" size={18} color={colors.primary} />
              <Text style={styles.testButtonText}>Send a test notification</Text>
            </TouchableOpacity>

            <View style={{ height: spacing.xxxl }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Feature Request Modal */}
      <Modal
        visible={showFeatureModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFeatureModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowFeatureModal(false)}
                disabled={featureSubmitting}
              >
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Request a Feature</Text>
              <TouchableOpacity
                onPress={handleSubmitFeatureRequest}
                disabled={featureSubmitting || !featureMessage.trim()}
              >
                <Text
                  style={[
                    styles.modalSave,
                    (featureSubmitting || !featureMessage.trim()) && styles.modalSaveDisabled,
                  ]}
                >
                  {featureSubmitting ? 'Sending…' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.availabilityDescription}>
                Have an idea for a feature or change that will make staying connected with your friends easier? We'd love to hear it. Your suggestions go straight to the team. (Aden and Evan)
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your idea</Text>
                <TextInput
                  style={[styles.input, styles.featureTextArea]}
                  value={featureMessage}
                  onChangeText={setFeatureMessage}
                  placeholder="What would you love to see in Link?"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                  editable={!featureSubmitting}
                  autoFocus
                />
                <Text style={styles.charCount}>{featureMessage.length}/1000</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your name (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={featureName}
                  onChangeText={setFeatureName}
                  placeholder="Let us know who to thank"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={60}
                  editable={!featureSubmitting}
                />
              </View>

              {!isFeatureRequestConfigured() && (
                <Text style={styles.featureHint}>
                  Note: feature requests aren't enabled in this build yet.
                </Text>
              )}

              <View style={{ height: spacing.xxxl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

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
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.screenTitle,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
  },

  // Profile Preview
  profilePreview: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  profileAvatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  profileAvatar: {
    width: avatarSizes.xxl,
    height: avatarSizes.xxl,
    borderRadius: avatarSizes.xxl / 2,
  },
  profileAvatarPlaceholder: {
    width: avatarSizes.xxl,
    height: avatarSizes.xxl,
    borderRadius: avatarSizes.xxl / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  profileName: {
    ...typography.sectionTitle,
    marginBottom: spacing.xxs,
  },
  profileUsername: {
    ...typography.body,
    color: colors.textMuted,
  },

  // Section
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.labelUppercase,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.sm,
  },

  // Settings item
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  settingsItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    ...typography.label,
    marginBottom: spacing.xxs,
  },
  settingsItemSubtitle: {
    ...typography.caption,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginLeft: spacing.lg + 40 + spacing.md,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginTop: spacing.xl,
  },
  footerText: {
    ...typography.caption,
    textAlign: 'center',
  },

  bottomPadding: {
    height: 100,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    ...typography.sectionTitle,
  },
  modalCancel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalSave: {
    ...typography.label,
    color: colors.primary,
  },
  modalSaveDisabled: {
    color: colors.textMuted,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },

  // Form styles
  formSectionTitle: {
    ...typography.labelUppercase,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  inputText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  placeholderText: {
    ...typography.body,
    color: colors.textMuted,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  featureTextArea: {
    minHeight: 160,
    paddingTop: spacing.md,
  },
  featureHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  // Date picker styles
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.sm,
  },
  datePickerText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  datePickerPlaceholder: {
    ...typography.body,
    color: colors.textMuted,
    flex: 1,
  },
  datePickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceMuted,
  },
  datePickerTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  datePickerDone: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  datePickerDoneText: {
    ...typography.label,
    color: colors.primary,
  },
  datePicker: {
    height: 200,
    backgroundColor: colors.surface,
  },
  charCount: {
    ...typography.captionSmall,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  // Photo modal styles
  photoModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  photoModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  photoModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  photoModalTitle: {
    ...typography.sectionTitle,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  photoPreviewContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primarySoft,
  },
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  photoOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  photoOptionText: {
    ...typography.label,
    flex: 1,
  },
  photoModalCancel: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  photoModalCancelText: {
    ...typography.label,
    color: colors.textSecondary,
  },

  // Availability modal styles
  availabilityDescription: {
    ...typography.body,
    marginBottom: spacing.xl,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  timePickerGroup: {
    flex: 1,
  },
  timeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.sm,
  },
  timeButtonText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  timeArrow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dayButtonSelected: {
    borderWidth: 0,
  },
  dayButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  dayButtonTextSelected: {
    ...typography.label,
    color: colors.textLight,
  },
  daysLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xxs,
  },
  dayLegendText: {
    ...typography.captionSmall,
    color: colors.textMuted,
    flex: 1,
    textAlign: 'center',
  },
  dayLegendTextSelected: {
    color: colors.primary,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  presetButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
  },
  testButtonText: {
    ...typography.label,
    color: colors.primary,
  },
});
