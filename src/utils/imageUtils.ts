import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_PROFILE_SIZE = 400;

export async function resizeProfileImage(uri: string): Promise<string> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_PROFILE_SIZE, height: MAX_PROFILE_SIZE } }],
    { compress: 0.8, format: SaveFormat.JPEG }
  );
  return result.uri;
}
