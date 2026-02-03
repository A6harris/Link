// src/screens/friends/SyncContactsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import {
  PhoneContact,
  requestContactsPermission,
  fetchPhoneContacts,
  convertToAppContact,
  normalizePhoneNumber,
} from '../../utils/phoneContacts';
import { loadContacts, addContact } from '../../utils/contactsStorage';
import { GradientButton } from '../../components';
import {
  colors,
  gradients,
  spacing,
  radius,
  typography,
  shadow,
} from '../../styles/theme';

export default function SyncContactsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [phoneContacts, setPhoneContacts] = useState<PhoneContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Filter contacts based on search query - matches names starting with query
  const getFilteredContacts = () => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return phoneContacts;
    }
    return phoneContacts.filter(contact => {
      const firstName = (contact.firstName || '').toLowerCase();
      const lastName = (contact.lastName || '').toLowerCase();
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      // Match if first name, last name, or full name starts with query
      return firstName.startsWith(query) || 
             lastName.startsWith(query) || 
             fullName.startsWith(query);
    });
  };
  
  const filteredContacts = getFilteredContacts();

  useEffect(() => {
    loadPhoneContacts();
  }, []);

  const loadPhoneContacts = async () => {
    setIsLoading(true);
    
    const hasPermission = await requestContactsPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your contacts in Settings to sync them with Link.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    try {
      // Load existing contacts to check for duplicates
      const existingContacts = await loadContacts();
      const existingPhoneSet = new Set(
        existingContacts
          .map(c => normalizePhoneNumber(c.phone))
          .filter(Boolean)
      );

      // Fetch phone contacts
      const contacts = await fetchPhoneContacts();
      
      // Filter out contacts that already exist (by phone number)
      const newContacts = contacts.filter(c => {
        const normalizedPhone = normalizePhoneNumber(c.phone);
        return normalizedPhone && !existingPhoneSet.has(normalizedPhone);
      });

      setPhoneContacts(newContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleContact = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    // Select all currently visible (filtered) contacts
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredContacts.forEach(c => next.add(c.id));
      return next;
    });
  };

  const deselectAll = () => {
    // Deselect all currently visible (filtered) contacts
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredContacts.forEach(c => next.delete(c.id));
      return next;
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('No Contacts Selected', 'Please select at least one contact to import.');
      return;
    }

    setIsSaving(true);
    try {
      const contactsToImport = phoneContacts.filter(c => selectedIds.has(c.id));
      
      for (const phoneContact of contactsToImport) {
        const appContact = convertToAppContact(phoneContact);
        await addContact(appContact);
      }

      Alert.alert(
        'Success!',
        `${selectedIds.size} contact${selectedIds.size > 1 ? 's' : ''} imported successfully.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error importing contacts:', error);
      Alert.alert('Error', 'Failed to import contacts. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderContact = ({ item }: { item: PhoneContact }) => {
    const isSelected = selectedIds.has(item.id);
    const name = [item.firstName, item.lastName].filter(Boolean).join(' ');

    return (
      <TouchableOpacity
        style={[styles.contactItem, isSelected && styles.contactItemSelected]}
        onPress={() => toggleContact(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[...gradients.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarInitials}>
                {item.firstName?.[0]?.toUpperCase() || '?'}
              </Text>
            </LinearGradient>
          )}
        </View>

        <View style={styles.contactInfo}>
          <Text style={styles.contactName} numberOfLines={1}>{name}</Text>
          {item.phone && (
            <Text style={styles.contactPhone} numberOfLines={1}>{item.phone}</Text>
          )}
        </View>

        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && (
            <Ionicons name="checkmark" size={18} color={colors.textLight} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.listHeaderText}>
        {searchQuery ? (
          `${filteredContacts.length} of ${phoneContacts.length} contact${phoneContacts.length !== 1 ? 's' : ''}`
        ) : (
          `${phoneContacts.length} new contact${phoneContacts.length !== 1 ? 's' : ''} found`
        )}
      </Text>
      <View style={styles.selectButtons}>
        <TouchableOpacity onPress={selectAll}>
          <Text style={styles.selectButtonText}>Select All</Text>
        </TouchableOpacity>
        <Text style={styles.selectDivider}>|</Text>
        <TouchableOpacity onPress={deselectAll}>
          <Text style={styles.selectButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.backgroundGradientStart, colors.backgroundGradientEnd] as const}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Sync Contacts</Text>
            <Text style={styles.headerSubtitle}>Import from your phone</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : phoneContacts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <LinearGradient
                colors={[...gradients.success]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyIconGradient}
              >
                <Ionicons name="checkmark-circle" size={48} color={colors.textLight} />
              </LinearGradient>
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>
              All your phone contacts are already in Link, or no contacts with phone numbers were found.
            </Text>
            <GradientButton
              title="Go Back"
              onPress={() => navigation.goBack()}
              size="lg"
            />
          </View>
        ) : (
          <>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or phone..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={(text) => setSearchQuery(text)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <FlatList
              data={filteredContacts}
              extraData={searchQuery}
              keyExtractor={(item) => item.id}
              renderItem={renderContact}
              ListHeaderComponent={renderListHeader}
              ListEmptyComponent={
                searchQuery.trim() ? (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.noResultsText}>No results</Text>
                  </View>
                ) : null
              }
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />

            {/* Import Button */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg }]}>
              <View style={styles.footerContent}>
                <GradientButton
                  title={isSaving ? 'Importing...' : `Import ${selectedIds.size} Contact${selectedIds.size !== 1 ? 's' : ''}`}
                  icon="download"
                  onPress={handleImport}
                  disabled={isSaving || selectedIds.size === 0}
                  fullWidth
                  size="lg"
                />
              </View>
            </View>
          </>
        )}
      </SafeAreaView>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
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

  // Search
  searchContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadow.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  clearButton: {
    padding: spacing.xs,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  loadingText: {
    ...typography.body,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
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

  // List
  listContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 140,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  listHeaderText: {
    ...typography.label,
  },
  selectButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  selectDivider: {
    color: colors.textMuted,
  },

  // No results
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  noResultsText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Contact item
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.xl,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadow.sm,
  },
  contactItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textLight,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    ...typography.label,
    fontSize: 16,
    marginBottom: spacing.xxs,
  },
  contactPhone: {
    ...typography.caption,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  footerContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
});
