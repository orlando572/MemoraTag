import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const directory = `${FileSystem.documentDirectory}event-documents/`;
const limit = 5 * 1024 * 1024;
const formats: Record<string, string> = { pdf: 'application/pdf', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
const safeName = /^[0-9a-f-]{36}\.(pdf|xls|xlsx)$/i;

export function documentFormat(name: string) {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  return formats[extension] ? { extension, mimeType: formats[extension] } : null;
}

export async function saveDocument(uri: string, originalName: string) {
  const format = documentFormat(originalName);
  if (!format) throw new Error('DOCUMENT_FORMAT');
  if (!FileSystem.documentDirectory) throw new Error('DOCUMENT_DIRECTORY');
  // Android content providers do not always report a reliable size. Verify
  // the private file after copying instead of trusting their metadata.
  const isLocalFile = uri.startsWith('file://');
  const source = isLocalFile ? await FileSystem.getInfoAsync(uri).catch(() => { throw new Error('DOCUMENT_SOURCE_INFO'); }) : null;
  if (source && (!source.exists || source.isDirectory || typeof source.size !== 'number')) throw new Error('DOCUMENT_SOURCE_INFO');
  if (source?.exists && source.size > limit) throw new Error('DOCUMENT_SIZE');
  try {
    const existing = await FileSystem.getInfoAsync(directory);
    if (!existing.exists) await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    else if (!existing.isDirectory) throw new Error('Not a directory');
  } catch { throw new Error('DOCUMENT_DIRECTORY'); }
  const name = `${Crypto.randomUUID()}.${format.extension}`;
  const destination = `${directory}${name}`;
  try {
    try {
      await FileSystem.copyAsync({ from: uri, to: destination });
    } catch {
      // Only use the bounded base64 fallback for local files with a known size.
      if (!source?.exists || source.isDirectory || typeof source.size !== 'number') throw new Error('DOCUMENT_SOURCE_COPY');
      await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => {});
      let contents: string;
      try { contents = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }); }
      catch { throw new Error('DOCUMENT_SOURCE_COPY'); }
      try { await FileSystem.writeAsStringAsync(destination, contents, { encoding: FileSystem.EncodingType.Base64 }); }
      catch { throw new Error('DOCUMENT_WRITE'); }
    }
    const copied = await FileSystem.getInfoAsync(destination).catch(() => { throw new Error('DOCUMENT_VERIFY'); });
    if (!copied.exists || copied.isDirectory || typeof copied.size !== 'number') throw new Error('DOCUMENT_VERIFY');
    if (copied.size > limit) throw new Error('DOCUMENT_SIZE');
    if (source?.exists && copied.size !== source.size) throw new Error('DOCUMENT_VERIFY');
    return name;
  } catch (error) {
    await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => {});
    throw error;
  }
}

export async function removeDocument(name: string) {
  if (safeName.test(name)) await FileSystem.deleteAsync(`${directory}${name}`, { idempotent: true });
}

export async function openDocument(name: string) {
  if (!safeName.test(name)) throw new Error('DOCUMENT_FORMAT');
  const uri = `${directory}${name}`;
  const file = await FileSystem.getInfoAsync(uri);
  if (!file.exists || file.isDirectory) throw new Error('DOCUMENT_READ');
  const format = documentFormat(name)!;
  if (Platform.OS === 'android') {
    const contentUri = await FileSystem.getContentUriAsync(uri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: contentUri, type: format.mimeType, flags: 1 });
  } else {
    if (!await Sharing.isAvailableAsync()) throw new Error('DOCUMENT_UNAVAILABLE');
    await Sharing.shareAsync(uri, { mimeType: format.mimeType, dialogTitle: 'Abrir documento' });
  }
}
