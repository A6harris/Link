import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCAL_USER_ID_KEY = '@link:localUserId';

export async function getOrCreateLocalUserId(): Promise<string> {
  const existing = await AsyncStorage.getItem(LOCAL_USER_ID_KEY);
  if (existing) return existing;
  const id = `local-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
  await AsyncStorage.setItem(LOCAL_USER_ID_KEY, id);
  return id;
}
