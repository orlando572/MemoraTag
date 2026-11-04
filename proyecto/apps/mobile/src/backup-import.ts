import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { backupDigest, createBackupDocument } from './backup-export';
import { BACKUP_LIMITS, validateBackup, type Backup, type BackupEvent, type BackupObject } from './backup-format';
import { planBackupMerge, type BackupPlan } from './backup-merge';
import { writeBackupRows } from './backup-sql';
import { openDatabase } from './storage';

export type PreparedImport = { incoming: Backup; plan: BackupPlan; currentDigest: string; requiredBytes: number };

async function ensureFreeSpace(required: number) {
  let free: number;
  try { free = await FileSystem.getFreeDiskStorageAsync(); }
  catch { throw new Error('BACKUP_SPACE_UNKNOWN'); }
  if (!Number.isFinite(free) || free < 0) throw new Error('BACKUP_SPACE_UNKNOWN');
  // Reserve extra space for SQLite journal and metadata; all incoming files is
  // a conservative upper bound even if some conflicts are kept locally.
  if (free < required + 1024 * 1024) throw new Error('BACKUP_SPACE');
}

async function snapshotDigest(backup: Backup) {
  return backupDigest(JSON.stringify({ ...backup, exportedAt: '' }));
}

// Selection is copied to app-owned cache first: content:// permissions and
// provider metadata differ across Android versions. Reject unknown-size files.
export async function prepareBackupImport(uri: string, reportedSize: number | undefined): Promise<PreparedImport> {
  if (!FileSystem.cacheDirectory || typeof reportedSize !== 'number' || !Number.isSafeInteger(reportedSize) || reportedSize < 0 || reportedSize > BACKUP_LIMITS.jsonBytes) throw new Error('BACKUP_SIZE');
  const temporary = `${FileSystem.cacheDirectory}memoratag-import-${Crypto.randomUUID()}.json`;
  try {
    await FileSystem.copyAsync({ from: uri, to: temporary });
    const info = await FileSystem.getInfoAsync(temporary);
    if (!info.exists || info.isDirectory || typeof info.size !== 'number' || info.size > BACKUP_LIMITS.jsonBytes) throw new Error('BACKUP_SIZE');
    const text = await FileSystem.readAsStringAsync(temporary);
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new Error('INVALID_BACKUP'); }
    const incoming = await validateBackup(parsed, backupDigest);
    const requiredBytes = incoming.files.reduce((total, file) => total + file.size, 0);
    await ensureFreeSpace(requiredBytes);
    const current = await validateBackup(JSON.parse(await createBackupDocument()), backupDigest);
    return { incoming, plan: planBackupMerge(current, incoming), currentDigest: await snapshotDigest(current), requiredBytes };
  } finally {
    await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(() => {});
  }
}

export async function applyBackupImport(prepared: PreparedImport, conflictChoice: 'current' | 'incoming', useProfile: boolean) {
  if (!FileSystem.documentDirectory) throw new Error('BACKUP_DIRECTORY');
  const { incoming, plan } = prepared;
  await ensureFreeSpace(prepared.requiredBytes);
  const latest = await validateBackup(JSON.parse(await createBackupDocument()), backupDigest);
  if (await snapshotDigest(latest) !== prepared.currentDigest) throw new Error('BACKUP_STALE');
  const objects = [...plan.newObjects, ...(conflictChoice === 'incoming' ? plan.objectConflicts.map((item) => item.incoming) : [])];
  const events = [...plan.newEvents, ...(conflictChoice === 'incoming' ? plan.eventConflicts.map((item) => item.incoming) : [])];
  const incomingFiles = new Map(incoming.files.map((file) => [file.key, file]));
  const copies = new Map<string, string>();
  const created: { uri: string; name: string; kind: 'photos' | 'documents' }[] = [];
  let committed = false;
  let transactionStarted = false;

  async function stage(kind: 'photos' | 'documents', name: string | null) {
    if (!name) return null;
    const key = `${kind}/${name}`;
    const existing = copies.get(key);
    if (existing) return existing;
    const file = incomingFiles.get(key);
    if (!file) throw new Error('INVALID_BACKUP');
    const extension = name.slice(name.lastIndexOf('.')).toLowerCase();
    const directory = `${FileSystem.documentDirectory}${kind === 'photos' ? 'object-photos' : 'event-documents'}/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const safeName = `${Crypto.randomUUID()}${extension}`;
    const destination = `${directory}${safeName}`;
    if ((await FileSystem.getInfoAsync(destination)).exists) throw new Error('BACKUP_FILE_WRITE');
    created.push({ uri: destination, name: safeName, kind });
    await FileSystem.writeAsStringAsync(destination, file.base64, { encoding: FileSystem.EncodingType.Base64 });
    const info = await FileSystem.getInfoAsync(destination);
    if (!info.exists || info.isDirectory || info.size !== file.size) throw new Error('BACKUP_FILE_WRITE');
    const stored = await FileSystem.readAsStringAsync(destination, { encoding: FileSystem.EncodingType.Base64 });
    if (await backupDigest(stored) !== file.sha256) throw new Error('BACKUP_FILE_WRITE');
    copies.set(key, safeName);
    return safeName;
  }

  try {
    const objectRows: BackupObject[] = [];
    const eventRows: BackupEvent[] = [];
    for (const object of objects) objectRows.push({ ...object, cover_image: await stage('photos', object.cover_image) });
    for (const event of events) eventRows.push({ ...event, photo: await stage('photos', event.photo), document_file: await stage('documents', event.document_file) });
    const db = await openDatabase();
    transactionStarted = true;
    await db.withExclusiveTransactionAsync(async (tx) => {
      await writeBackupRows((sql, ...values) => tx.runAsync(sql, ...values), objectRows, eventRows, useProfile ? incoming.profile?.name ?? null : null);
      // The exclusive transaction uses another SQLite connection; do not
      // assume it inherited PRAGMA foreign_keys from the main connection.
      if ((await tx.getAllAsync('PRAGMA foreign_key_check')).length > 0) throw new Error('BACKUP_RELATION');
    });
    committed = true;
    return { objects: objectRows.length, events: eventRows.length, name: useProfile ? incoming.profile?.name ?? null : null };
  } finally {
    // Previous files are never deleted here: interrupted cleanup must not risk
    // another record that may still reference them.
    if (!committed) for (const file of created) {
      try {
        // If the transaction's outcome is uncertain, only remove files after
        // checking that no committed row references them.
        if (transactionStarted) {
          const db = await openDatabase();
          const found = file.kind === 'photos'
            ? await db.getFirstAsync<{ count: number }>('SELECT (SELECT count(*) FROM objects WHERE cover_image = ?) + (SELECT count(*) FROM events WHERE photo = ?) AS count', file.name, file.name)
            : await db.getFirstAsync<{ count: number }>('SELECT count(*) AS count FROM events WHERE document_file = ?', file.name);
          if (!found || found.count !== 0) continue;
        }
        await FileSystem.deleteAsync(file.uri, { idempotent: true });
      } catch { /* Preserve the file if its safety cannot be established. */ }
    }
  }
}
