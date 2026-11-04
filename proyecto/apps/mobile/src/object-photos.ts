import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

const directory = `${FileSystem.documentDirectory}object-photos/`;
const limit = 5 * 1024 * 1024;
const validName = /^[0-9a-f-]{36}\.(jpg|png|webp|heic|heif)$/i;
const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' };

export function photoUri(name: string | null) {
  return name && validName.test(name) ? `${directory}${name}` : null;
}

export async function savePhoto(uri: string, mimeType?: string | null, fileName?: string | null) {
  const fallbackExtension = fileName?.toLowerCase().match(/\.(jpe?g|png|webp|heic|heif)$/)?.[1]?.replace('jpeg', 'jpg');
  const extension = mimeType ? extensions[mimeType.toLowerCase()] : fallbackExtension;
  if (!extension) throw new Error('FORMAT');
  const source = await FileSystem.getInfoAsync(uri);
  if (!source.exists || source.isDirectory || typeof source.size !== 'number') throw new Error('UNREADABLE');
  if (source.size > limit) throw new Error('SIZE');
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const name = `${Crypto.randomUUID()}.${extension}`;
  const destination = `${directory}${name}`;
  try {
    await FileSystem.copyAsync({ from: uri, to: destination });
    const copied = await FileSystem.getInfoAsync(destination);
    if (!copied.exists || copied.isDirectory || typeof copied.size !== 'number' || copied.size > limit) throw new Error('SIZE');
    return name;
  } catch (error) {
    await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => {});
    throw error;
  }
}

export async function removePhoto(name: string | null) {
  const uri = photoUri(name);
  if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
}
