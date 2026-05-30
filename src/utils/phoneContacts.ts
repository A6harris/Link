// src/utils/phoneContacts.ts
import * as Contacts from 'expo-contacts';
import * as FileSystem from 'expo-file-system';
import type { Contact } from '../types';
import { DEFAULT_CONTACT_FREQUENCY } from '../constants/contactFrequency';
import { generateId } from './localUser';

export interface PhoneContact {
  id: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  imageUri?: string;
  birthday?: string; // ISO date string (YYYY-MM-DD)
  selected?: boolean;
}

/**
 * Request permission to access device contacts
 */
export async function requestContactsPermission(): Promise<boolean> {
  const { status } = await Contacts.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Check if contacts permission is already granted
 */
export async function checkContactsPermission(): Promise<boolean> {
  const { status } = await Contacts.getPermissionsAsync();
  return status === 'granted';
}

function formatBirthday(birthday: Contacts.Date | undefined): string | undefined {
  if (!birthday) return undefined;
  const { year, month, day } = birthday;
  if (month === undefined || day === undefined) return undefined;
  const yearStr = year !== undefined ? String(year).padStart(4, '0') : '1900';
  const monthStr = String(month + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
}

/**
 * Fetch all contacts from the device.
 * Note: sort and Thumbnail fields are intentionally omitted — they cause
 * crashes on New Architecture builds (binary data crossing the bridge).
 * Pagination (pageSize/pageOffset) is also omitted — hasNextPage behaves
 * unreliably on New Architecture and caused an infinite loop. Sorting in JS.
 */
export async function fetchPhoneContacts(): Promise<PhoneContact[]> {
  const result = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.FirstName,
      Contacts.Fields.LastName,
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Birthday,
    ],
  });

  return (result.data ?? [])
    .filter(contact =>
      (contact.firstName || contact.lastName) &&
      contact.phoneNumbers &&
      contact.phoneNumbers.length > 0
    )
    .map(contact => ({
      id: contact.id || `phone-${Date.now()}-${generateId()}`,
      firstName: contact.firstName || '',
      lastName: contact.lastName || undefined,
      phone: contact.phoneNumbers?.[0]?.number || undefined,
      imageUri: undefined,
      birthday: formatBirthday(contact.birthday),
    }))
    .sort((a, b) => {
      const nameA = [a.lastName, a.firstName].filter(Boolean).join(' ').toLowerCase();
      const nameB = [b.lastName, b.firstName].filter(Boolean).join(' ').toLowerCase();
      return nameA.localeCompare(nameB);
    });
}

/**
 * Normalize phone number for comparison (strip non-digits)
 */
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Convert a phone contact to an app Contact
 */
export function convertToAppContact(phoneContact: PhoneContact): Contact {
  return {
    id: `imported-${Date.now()}-${generateId()}`,
    firstName: phoneContact.firstName,
    lastName: phoneContact.lastName,
    phone: phoneContact.phone,
    profileImage: phoneContact.imageUri,
    contactFrequency: DEFAULT_CONTACT_FREQUENCY,
    birthday: phoneContact.birthday || null,
    lastContacted: null,
    lastContactedCount: null,
    notes: null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Fetch a single contact's photo and copy it to documentDirectory.
 * Returns a relative path (e.g. "profile_images/xxx.jpg") or undefined.
 * Safe on New Architecture because it fetches one contact at a time, not all.
 */
export async function fetchAndSaveContactImage(contactId: string): Promise<string | undefined> {
  try {
    const contact = await Contacts.getContactByIdAsync(contactId, [Contacts.Fields.Image]);
    if (!contact?.imageAvailable || !contact.image?.uri) return undefined;
    const dir = `${FileSystem.documentDirectory}profile_images/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const relPath = `profile_images/profile_import_${Date.now()}_${generateId()}.jpg`;
    await FileSystem.copyAsync({ from: contact.image.uri, to: `${FileSystem.documentDirectory}${relPath}` });
    return relPath;
  } catch {
    return undefined;
  }
}

export default {
  requestContactsPermission,
  checkContactsPermission,
  fetchPhoneContacts,
  fetchAndSaveContactImage,
  normalizePhoneNumber,
  convertToAppContact,
};
