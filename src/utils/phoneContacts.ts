// src/utils/phoneContacts.ts
import * as Contacts from 'expo-contacts';
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

/**
 * Format a contact birthday to ISO date string (YYYY-MM-DD)
 */
function formatBirthday(birthday: Contacts.Date | undefined): string | undefined {
  if (!birthday) return undefined;
  
  const { year, month, day } = birthday;
  
  // Need at least month and day for a meaningful birthday
  if (month === undefined || day === undefined) return undefined;
  
  // Use a placeholder year if not provided (common for birthdays without year)
  const yearStr = year !== undefined ? String(year).padStart(4, '0') : '1900';
  const monthStr = String(month + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  
  return `${yearStr}-${monthStr}-${dayStr}`;
}

/**
 * Fetch all contacts from the device including birthday and photo
 */
export async function fetchPhoneContacts(): Promise<PhoneContact[]> {
  const PAGE_SIZE = 200;
  const allData: Contacts.Contact[] = [];
  let pageOffset = 0;

  while (true) {
    const result = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.FirstName,
        Contacts.Fields.LastName,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Thumbnail,
        Contacts.Fields.Birthday,
      ],
      sort: Contacts.SortTypes.LastName,
      pageSize: PAGE_SIZE,
      pageOffset,
    });
    allData.push(...result.data);
    if (!result.hasNextPage) break;
    pageOffset += PAGE_SIZE;
  }

  return allData
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
      imageUri: contact.thumbnail?.uri || undefined,
      birthday: formatBirthday(contact.birthday),
    }));
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

export default {
  requestContactsPermission,
  checkContactsPermission,
  fetchPhoneContacts,
  normalizePhoneNumber,
  convertToAppContact,
};
