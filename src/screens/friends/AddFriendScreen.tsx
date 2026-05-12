// src/screens/friends/AddFriendScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import DateTimePicker from '@react-native-community/datetimepicker';

import type { Contact, ContactFrequency } from '../../types';
import {
  CONTACT_FREQUENCY_CONFIG,
  CONTACT_FREQUENCY_ORDER,
  DEFAULT_CONTACT_FREQUENCY,
} from '../../constants/contactFrequency';
import {
  colors,
  gradients,
  spacing,
  radius,
  typography,
  shadow,
} from '../../styles/theme';
import { GradientButton } from '../../components';
import { addContact } from '../../utils/contactsStorage';

const FREQUENCY_OPTIONS = CONTACT_FREQUENCY_ORDER.map(value => ({
  value,
  label: CONTACT_FREQUENCY_CONFIG[value].label,
  shortLabel: CONTACT_FREQUENCY_CONFIG[value].shortLabel,
  color: CONTACT_FREQUENCY_CONFIG[value].color,
}));

const formatPhoneNumber = (text: string): string => {
  const digits = text.replace(/\D/g, '');
  const limited = digits.slice(0, 10);
  if (limited.length === 0) return '';
  if (limited.length <= 3) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
};

const formatBirthdayDisplay = (date: Date | null): string => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const dateToISOString = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AddFriendScreen() {
  const navigation = useNavigation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [profileImage, setProfileImage] = useState<string | undefined>();
  const [selectedFrequency, setSelectedFrequency] = useState<ContactFrequency>(DEFAULT_CONTACT_FREQUENCY);
  const [isSaving, setIsSaving] = useState(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhoneNumber(text));
  };

  const handleBirthdayChange = useCallback((event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowBirthdayPicker(false);
    }
    if (date) {
      setBirthday(date);
    }
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Allow photo access to set a profile image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const picked = result.assets[0].uri;
      try {
        const dir = `${FileSystem.documentDirectory}profile_images/`;
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        const dest = `${dir}profile_${Date.now()}.jpg`;
        await FileSystem.copyAsync({ from: picked, to: dest });
        setProfileImage(dest);
      } catch {
        setProfileImage(picked);
      }
    }
  };

  const handleSaveManualContact = async () => {
    if (!firstName.trim()) {
      Alert.alert('Required Field', 'Please enter a first name.');
      return;
    }
    if (!profileImage) {
      Alert.alert('Required Field', 'Please add a profile photo.');
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      Alert.alert('Required Field', 'Please enter a complete 10-digit phone number.');
      return;
    }
    const normalizedBirthday: string | null = birthday ? dateToISOString(birthday) : null;
    setIsSaving(true);
    try {
      const newContact: Contact = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phone: phone.trim(),
        birthday: normalizedBirthday,
        notes: notes.trim() || null,
        profileImage,
        contactFrequency: selectedFrequency,
        createdAt: new Date().toISOString(),
      };
      await addContact(newContact);
      Alert.alert(
        'Contact Saved!',
        `${firstName} ${lastName}`.trim() + ' has been added to your contacts.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to save contact. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedFrequencyOption = FREQUENCY_OPTIONS.find(opt => opt.value === selectedFrequency);

  const renderFrequencyPicker = () => (
    <Modal
      visible={showFrequencyPicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowFrequencyPicker(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowFrequencyPicker(false)}
      >
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>How often to connect?</Text>
            <TouchableOpacity onPress={() => setShowFrequencyPicker(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.pickerOptions} showsVerticalScrollIndicator={false}>
            {FREQUENCY_OPTIONS.map((option) => {
              const isSelected = selectedFrequency === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.pickerOption,
                    isSelected && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedFrequency(option.value);
                    setShowFrequencyPicker(false);
                  }}
                >
                  <View style={[styles.frequencyDot, { backgroundColor: option.color }]} />
                  <View style={styles.pickerOptionText}>
                    <Text style={[
                      styles.pickerOptionLabel,
                      isSelected && styles.pickerOptionLabelSelected,
                    ]}>
                      {option.shortLabel}
                    </Text>
                    <Text style={styles.pickerOptionDescription}>
                      {option.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderManualForm = () => (
    <ScrollView
      style={styles.formScroll}
      contentContainerStyle={styles.formContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.formCard}>
        {/* Profile Image Picker - Required */}
        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImageLarge} />
          ) : (
            <View style={styles.imagePickerPlaceholder}>
              <Ionicons name="camera" size={32} color={colors.textMuted} />
              <Text style={styles.imagePickerText}>Add Photo *</Text>
            </View>
          )}
          <View style={styles.imagePickerBadge}>
            <Ionicons name="add" size={16} color={colors.textLight} />
          </View>
        </TouchableOpacity>

        {/* Name Fields */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>First Name *</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={colors.textMuted}
              style={styles.textInput}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Last Name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={colors.textMuted}
              style={styles.textInput}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Phone - Required */}
        <Text style={styles.fieldLabel}>Phone Number *</Text>
        <TextInput
          value={phone}
          onChangeText={handlePhoneChange}
          placeholder="(555) 123-4567"
          placeholderTextColor={colors.textMuted}
          style={styles.textInput}
          keyboardType="number-pad"
          maxLength={14}
        />

        {/* Birthday */}
        <Text style={styles.fieldLabel}>Birthday</Text>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowBirthdayPicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={birthday ? styles.datePickerText : styles.datePickerPlaceholder}>
            {birthday ? formatBirthdayDisplay(birthday) : 'Select birthday'}
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
              value={birthday || new Date(2000, 0, 1)}
              mode="date"
              display="spinner"
              onChange={handleBirthdayChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              style={styles.datePicker}
            />
          </View>
        )}

        {/* Contact Frequency Dropdown */}
        <Text style={styles.fieldLabel}>How often to connect? *</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowFrequencyPicker(true)}
        >
          <View style={styles.dropdownContent}>
            <View style={[styles.frequencyDot, { backgroundColor: selectedFrequencyOption?.color }]} />
            <Text style={styles.dropdownText}>
              {selectedFrequencyOption?.shortLabel} - {selectedFrequencyOption?.label}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Notes */}
        <Text style={styles.fieldLabel}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="How do you know this person? Any important details..."
          placeholderTextColor={colors.textMuted}
          style={[styles.textInput, styles.notesInput]}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <GradientButton
            title={isSaving ? "Saving..." : "Save Contact"}
            icon="checkmark"
            onPress={handleSaveManualContact}
            disabled={isSaving || !firstName.trim() || !profileImage || phone.replace(/\D/g, '').length !== 10}
            fullWidth
            size="lg"
          />
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd] as const}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.headerTitles}>
                <Text style={styles.headerTitle}>Add Contact</Text>
                <Text style={styles.headerSubtitle}>Enter contact details</Text>
              </View>
              <View style={styles.headerSpacer} />
            </View>
          </View>

          {renderManualForm()}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {renderFrequencyPicker()}
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
  content: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    ...shadow.sm,
  },
  headerTitles: {
    flex: 1,
  },
  headerSpacer: {
    width: 44,
  },
  headerTitle: {
    ...typography.screenTitle,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
  },

  // Manual Form
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    marginTop: spacing.md,
    ...shadow.card,
  },
  imagePicker: {
    alignSelf: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  profileImageLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  imagePickerPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed',
  },
  imagePickerText: {
    ...typography.caption,
    marginTop: spacing.xs,
    color: colors.accent,
    fontWeight: '600',
  },
  imagePickerBadge: {
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
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldLabel: {
    ...typography.label,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: spacing.md,
  },

  // Date picker
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.sm,
  },
  datePickerText: {
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
  },
  datePickerPlaceholder: {
    fontSize: 16,
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

  // Dropdown
  dropdownButton: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  frequencyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  saveButtonContainer: {
    marginTop: spacing.xxl,
  },

  // Modal Picker
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxHeight: '60%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  pickerTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  pickerOptions: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.xs,
    gap: spacing.md,
  },
  pickerOptionSelected: {
    backgroundColor: colors.primarySoft,
  },
  pickerOptionText: {
    flex: 1,
  },
  pickerOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  pickerOptionLabelSelected: {
    color: colors.primary,
  },
  pickerOptionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
