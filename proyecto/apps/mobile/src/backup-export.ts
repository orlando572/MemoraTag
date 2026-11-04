import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { BACKUP_LIMITS, validateBackup, type Backup, type BackupEvent, type BackupFile, type BackupObject } from './backup-format';
import { documentUri } from './event-document';
import { photoUri } from './object-photos';
import { openDatabase } from './storage';

export async function backupDigest(base64: string) {
  return (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64)).toLowerCase();
}

function utf8Bytes(value: string) {
  let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x80) bytes++;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length && value.charCodeAt(i + 1) >= 0xdc00 && value.charCodeAt(i + 1) <= 0xdfff) { bytes += 4; i++; }
    else bytes += 3;
  }
  return bytes;
}

// The caller must prevent edits for the duration of this operation. No existing
// files or rows are changed; absent attachments abort instead of being omitted.
export async function createBackupDocument() {
  const db = await openDatabase();
  let objects: BackupObject[] = [];
  let events: BackupEvent[] = [];
  let profile: { name: string } | null = null;
  await db.withExclusiveTransactionAsync(async (tx) => {
    objects = await tx.getAllAsync<BackupObject>('SELECT id, name, description, created_at, archived_at, cover_image, color FROM objects ORDER BY id');
    events = await tx.getAllAsync<BackupEvent>('SELECT id, object_id, title, description, created_at, type, event_date, photo, document_file, document_name FROM events ORDER BY id');
    profile = await tx.getFirstAsync<{ name: string }>('SELECT name FROM local_profile WHERE id = 1');
  });
  if (objects.length > BACKUP_LIMITS.objects || events.length > BACKUP_LIMITS.events) throw new Error('BACKUP_LIMIT');

  const references = new Map<string, string>();
  function add(kind: 'photos' | 'documents', name: string | null) {
    if (!name) return;
    const uri = kind === 'photos' ? photoUri(name) : documentUri(name);
    if (!uri) throw new Error('BACKUP_INVALID_REFERENCE');
    references.set(`${kind}/${name}`, uri);
  }
  for (const item of objects) add('photos', item.cover_image);
  for (const item of events) { add('photos', item.photo); add('documents', item.document_file); }
  if (references.size > BACKUP_LIMITS.files) throw new Error('BACKUP_LIMIT');

  let total = 0;
  const files: BackupFile[] = [];
  for (const [key, uri] of references) {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory || typeof info.size !== 'number') throw new Error('BACKUP_FILE_MISSING');
    if (info.size > BACKUP_LIMITS.fileBytes || (total += info.size) > BACKUP_LIMITS.totalBytes) throw new Error('BACKUP_LIMIT');
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    files.push({ key, size: info.size, base64, sha256: await backupDigest(base64) });
  }
  const backup: Backup = { format: 'memoratag-backup', version: 1, appVersion: Constants.expoConfig?.version ?? 'desconocida', exportedAt: new Date().toISOString(), profile, objects, events, files };
  await validateBackup(backup, backupDigest);
  const output = JSON.stringify(backup);
  if (utf8Bytes(output) > BACKUP_LIMITS.jsonBytes) throw new Error('BACKUP_LIMIT');
  return output;
}
