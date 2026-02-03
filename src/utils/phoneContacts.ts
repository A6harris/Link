// src/utils/phoneContacts.ts
import * as Contacts from 'expo-contacts';
import type { Contact } from '../types';
import { DEFAULT_CONTACT_FREQUENCY } from '../constants/contactFrequency';

export interface PhoneContact {
  id: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  imageUri?: string;
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
 * Fetch all contacts from the device
 */
export async function fetchPhoneContacts(): Promise<PhoneContact[]> {
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.FirstName,
      Contacts.Fields.LastName,
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Image,
    ],
    sort: Contacts.SortTypes.LastName,
  });

  // Filter contacts that have at least a name and phone number
  return data
    .filter(contact => 
      (contact.firstName || contact.lastName) && 
      contact.phoneNumbers && 
      contact.phoneNumbers.length > 0
    )
    .map(contact => ({
      id: contact.id || `phone-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      firstName: contact.firstName || '',
      lastName: contact.lastName || undefined,
      phone: contact.phoneNumbers?.[0]?.number || undefined,
      imageUri: contact.image?.uri || undefined,
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
    id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    firstName: phoneContact.firstName,
    lastName: phoneContact.lastName,
    phone: phoneContact.phone,
    profileImage: phoneContact.imageUri,
    contactFrequency: DEFAULT_CONTACT_FREQUENCY,
    birthday: null,
    lastContacted: null,
    lastContactedCount: null,
    notes: 'Imported from phone contacts',
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
