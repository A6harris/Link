import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

const MAX_PROFILE_SIZE = 1024;

export async function resizeProfileImage(uri: string): Promise<string> {
  // Only constrain width — passing both width and height forces an exact box and
  // distorts non-square photos. With width alone the height scales to preserve
  // aspect ratio. High quality so enlarging to fill the hero stays crisp.
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_PROFILE_SIZE } }],
    { compress: 0.92, format: SaveFormat.JPEG }
  );
  return result.uri;
}

/**
 * Resolve a stored profileImage value to a usable URI.
 * Stored values may be relative paths (new format: "profile_images/xxx.jpg")
 * or legacy absolute paths with a potentially stale container UUID.
 * Both cases are handled by anchoring to the current documentDirectory.
 */
export function resolveProfileImageUri(stored: string | undefined): string | undefined {
  if (!stored) return undefined;
  if (stored.startsWith('file://') || stored.startsWith('/')) {
    // Legacy absolute path — re-anchor in case the app container UUID changed
    const match = stored.match(/profile_images\/.+$/);
    if (match) return `${FileSystem.documentDirectory}${match[0]}`;
    return stored;
  }
  // Relative path (new format)
  return `${FileSystem.documentDirectory}${stored}`;
}
