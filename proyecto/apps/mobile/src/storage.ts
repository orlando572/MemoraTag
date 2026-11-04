import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { removePhoto } from './object-photos';
import { removeDocument } from './event-document';

export type MemoryObject = { id: string; name: string; description: string; created_at: string; cover_image: string | null; color: string; icon?: string | null; nfc_written_at?: string | null; open_issues?: number; last_maintenance?: string | null; latest_event_title?: string | null; latest_event_date?: string | null; latest_event_type?: EventType | null };
export type EventType = 'note' | 'issue' | 'maintenance';
export type MemoryEvent = { id: string; object_id: string; title: string; description: string; created_at: string; type: EventType; event_date: string; photo: string | null; document_file: string | null; document_name: string | null; resolved_at?: string | null };

let database: Promise<SQLite.SQLiteDatabase> | undefined;

export function openDatabase() {
  if (!database) {
    database = SQLite.openDatabaseAsync('memoratag.db').then(async (db) => {
      await db.execAsync(`PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS objects (
          id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL,
          description TEXT NOT NULL, created_at TEXT NOT NULL, archived_at TEXT, cover_image TEXT, color TEXT NOT NULL DEFAULT '#DCEBE2'
        );
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY NOT NULL, object_id TEXT NOT NULL REFERENCES objects(id),
          title TEXT NOT NULL, description TEXT NOT NULL, created_at TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'note', event_date TEXT, photo TEXT, document_file TEXT, document_name TEXT
        );
        CREATE TABLE IF NOT EXISTS local_profile (
          id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT NOT NULL
        );`);
      // Preserve databases created before objects could be archived.
      const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(objects)');
      if (!columns.some((column) => column.name === 'archived_at')) {
        await db.execAsync('ALTER TABLE objects ADD COLUMN archived_at TEXT');
      }
      if (!columns.some((column) => column.name === 'cover_image')) {
        await db.execAsync('ALTER TABLE objects ADD COLUMN cover_image TEXT');
      }
      if (!columns.some((column) => column.name === 'color')) {
        await db.execAsync("ALTER TABLE objects ADD COLUMN color TEXT NOT NULL DEFAULT '#DCEBE2'");
      }
      if (!columns.some((column) => column.name === 'nfc_written_at')) {
        await db.execAsync('ALTER TABLE objects ADD COLUMN nfc_written_at TEXT');
      }
      if (!columns.some((column) => column.name === 'icon')) {
        await db.execAsync('ALTER TABLE objects ADD COLUMN icon TEXT');
      }
      const profileColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(local_profile)');
      if (!profileColumns.some((column) => column.name === 'onboarding_done')) {
        await db.execAsync('ALTER TABLE local_profile ADD COLUMN onboarding_done INTEGER NOT NULL DEFAULT 0');
      }
      if (!profileColumns.some((column) => column.name === 'theme_mode')) {
        await db.execAsync("ALTER TABLE local_profile ADD COLUMN theme_mode TEXT NOT NULL DEFAULT 'system'");
      }
      const eventColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(events)');
      if (!eventColumns.some((column) => column.name === 'type')) {
        await db.execAsync("ALTER TABLE events ADD COLUMN type TEXT NOT NULL DEFAULT 'note'");
      }
      if (!eventColumns.some((column) => column.name === 'event_date')) {
        await db.execAsync('ALTER TABLE events ADD COLUMN event_date TEXT');
      }
      if (!eventColumns.some((column) => column.name === 'photo')) {
        await db.execAsync('ALTER TABLE events ADD COLUMN photo TEXT');
      }
      if (!eventColumns.some((column) => column.name === 'document_file')) {
        await db.execAsync('ALTER TABLE events ADD COLUMN document_file TEXT');
      }
      if (!eventColumns.some((column) => column.name === 'document_name')) {
        await db.execAsync('ALTER TABLE events ADD COLUMN document_name TEXT');
      }
      if (!eventColumns.some((column) => column.name === 'resolved_at')) {
        await db.execAsync('ALTER TABLE events ADD COLUMN resolved_at TEXT');
      }
      await db.execAsync("UPDATE events SET event_date = date(created_at, 'localtime') WHERE event_date IS NULL");
      return db;
    }).catch((error) => {
      database = undefined;
      throw error;
    });
  }
  return database;
}

export async function getLocalName() {
  const profile = await (await openDatabase()).getFirstAsync<{ name: string }>('SELECT name FROM local_profile WHERE id = 1');
  return profile?.name ?? null;
}

export async function getOnboardingDone() {
  const profile = await (await openDatabase()).getFirstAsync<{ onboarding_done: number }>('SELECT onboarding_done FROM local_profile WHERE id = 1');
  return profile?.onboarding_done === 1;
}

export async function setOnboardingDone() {
  await (await openDatabase()).runAsync('UPDATE local_profile SET onboarding_done = 1 WHERE id = 1');
}

export type ThemeMode = 'system' | 'light' | 'dark';

export async function getThemeMode(): Promise<ThemeMode> {
  const row = await (await openDatabase()).getFirstAsync<{ theme_mode: string }>('SELECT theme_mode FROM local_profile WHERE id = 1');
  return row?.theme_mode === 'light' || row?.theme_mode === 'dark' ? row.theme_mode : 'system';
}

export async function setThemeMode(mode: ThemeMode) {
  await (await openDatabase()).runAsync('UPDATE local_profile SET theme_mode = ? WHERE id = 1', mode);
}

export async function saveLocalName(name: string) {
  await (await openDatabase()).runAsync('INSERT INTO local_profile (id, name) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name', name);
}

// UUIDs are created on the device and remain unchanged if data is synced later.
function newId() {
  return Crypto.randomUUID();
}

export async function listObjects() {
  return (await openDatabase()).getAllAsync<MemoryObject>(`SELECT objects.*,
    (SELECT title FROM events WHERE events.object_id = objects.id ORDER BY event_date DESC, created_at DESC, id DESC LIMIT 1) AS latest_event_title,
    (SELECT event_date FROM events WHERE events.object_id = objects.id ORDER BY event_date DESC, created_at DESC, id DESC LIMIT 1) AS latest_event_date,
    (SELECT type FROM events WHERE events.object_id = objects.id ORDER BY event_date DESC, created_at DESC, id DESC LIMIT 1) AS latest_event_type,
    (SELECT count(*) FROM events WHERE events.object_id = objects.id AND type = 'issue' AND resolved_at IS NULL) AS open_issues,
    (SELECT max(event_date) FROM events WHERE events.object_id = objects.id AND type = 'maintenance') AS last_maintenance
    FROM objects WHERE archived_at IS NULL ORDER BY created_at DESC`);
}

export async function listArchivedObjects() {
  return (await openDatabase()).getAllAsync<MemoryObject>(`SELECT objects.*,
    (SELECT title FROM events WHERE events.object_id = objects.id ORDER BY event_date DESC, created_at DESC, id DESC LIMIT 1) AS latest_event_title,
    (SELECT event_date FROM events WHERE events.object_id = objects.id ORDER BY event_date DESC, created_at DESC, id DESC LIMIT 1) AS latest_event_date,
    (SELECT type FROM events WHERE events.object_id = objects.id ORDER BY event_date DESC, created_at DESC, id DESC LIMIT 1) AS latest_event_type,
    (SELECT count(*) FROM events WHERE events.object_id = objects.id AND type = 'issue' AND resolved_at IS NULL) AS open_issues,
    (SELECT max(event_date) FROM events WHERE events.object_id = objects.id AND type = 'maintenance') AS last_maintenance
    FROM objects WHERE archived_at IS NOT NULL ORDER BY archived_at DESC`);
}

export async function findActiveObject(id: string) {
  return (await openDatabase()).getFirstAsync<MemoryObject>(`SELECT id, name, description, created_at, cover_image, color, icon, nfc_written_at,
    (SELECT count(*) FROM events WHERE events.object_id = objects.id AND type = 'issue' AND resolved_at IS NULL) AS open_issues,
    (SELECT max(event_date) FROM events WHERE events.object_id = objects.id AND type = 'maintenance') AS last_maintenance
    FROM objects WHERE id = ? AND archived_at IS NULL`, id);
}

/** Distinguishes an archived object from one that does not exist on this device. */
export async function objectState(id: string): Promise<'archived' | 'missing'> {
  const row = await (await openDatabase()).getFirstAsync<{ archived_at: string | null }>('SELECT archived_at FROM objects WHERE id = ?', id);
  return row ? 'archived' : 'missing';
}

export async function listEvents(objectId: string) {
  return (await openDatabase()).getAllAsync<MemoryEvent>('SELECT * FROM events WHERE object_id = ? ORDER BY event_date DESC, created_at DESC, id DESC', objectId);
}

/** Creates an object and returns its id. */
export async function createObject(name: string, description: string, coverImage: string | null, color: string, icon: string | null = null) {
  const id = newId();
  await (await openDatabase()).runAsync('INSERT INTO objects (id, name, description, created_at, cover_image, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?)', id, name, description, new Date().toISOString(), coverImage, color, icon);
  return id;
}

export async function updateObject(id: string, name: string, description: string, coverImage: string | null, color: string, icon: string | null = null) {
  const result = await (await openDatabase()).runAsync('UPDATE objects SET name = ?, description = ?, cover_image = ?, color = ?, icon = ? WHERE id = ? AND archived_at IS NULL', name, description, coverImage, color, icon, id);
  if (result.changes !== 1) throw new Error('Object not found or archived');
}

/** Records that a tag was written and verified for this object. Returns the timestamp. */
export async function markNfcWritten(id: string) {
  const at = new Date().toISOString();
  await (await openDatabase()).runAsync('UPDATE objects SET nfc_written_at = ? WHERE id = ?', at, id);
  return at;
}

export async function archiveObject(id: string) {
  const result = await (await openDatabase()).runAsync('UPDATE objects SET archived_at = ? WHERE id = ? AND archived_at IS NULL', new Date().toISOString(), id);
  if (result.changes !== 1) throw new Error('Object not found or archived');
}

export async function restoreObject(id: string) {
  const result = await (await openDatabase()).runAsync('UPDATE objects SET archived_at = NULL WHERE id = ? AND archived_at IS NOT NULL', id);
  if (result.changes !== 1) throw new Error('Object not found or not archived');
}

export async function createEvent(objectId: string, title: string, description: string, type: EventType, eventDate: string, photo: string | null, documentFile: string | null, documentName: string | null) {
  await (await openDatabase()).runAsync('INSERT INTO events (id, object_id, title, description, created_at, type, event_date, photo, document_file, document_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', newId(), objectId, title, description, new Date().toISOString(), type, eventDate, photo, documentFile, documentName);
}

export async function updateEvent(event: MemoryEvent) {
  const result = await (await openDatabase()).runAsync(
    "UPDATE events SET title = ?, description = ?, type = ?, event_date = ?, photo = ?, document_file = ?, document_name = ?, resolved_at = CASE WHEN ? = 'issue' THEN resolved_at ELSE NULL END WHERE id = ? AND object_id = ? AND EXISTS (SELECT 1 FROM objects WHERE id = ? AND archived_at IS NULL)",
    event.title, event.description, event.type, event.event_date, event.photo, event.document_file, event.document_name, event.type, event.id, event.object_id, event.object_id,
  );
  if (result.changes !== 1) throw new Error('Event not found or object archived');
}

/** Marks an issue as resolved (now) or reopens it. Returns the new resolved_at. */
export async function setIssueResolved(id: string, objectId: string, resolved: boolean) {
  const at = resolved ? new Date().toISOString() : null;
  const result = await (await openDatabase()).runAsync("UPDATE events SET resolved_at = ? WHERE id = ? AND object_id = ? AND type = 'issue'", at, id, objectId);
  if (result.changes !== 1) throw new Error('Issue not found');
  return at;
}

export async function getEvent(id: string) {
  return (await openDatabase()).getFirstAsync<MemoryEvent>('SELECT * FROM events WHERE id = ?', id);
}

export async function deleteEvent(id: string, objectId: string) {
  const db = await openDatabase();
  let attachments: { photo: string | null; document_file: string | null } | null = null;
  await db.withExclusiveTransactionAsync(async (tx) => {
    attachments = await tx.getFirstAsync<{ photo: string | null; document_file: string | null }>(
      'SELECT photo, document_file FROM events WHERE id = ? AND object_id = ? AND EXISTS (SELECT 1 FROM objects WHERE id = ? AND archived_at IS NULL)', id, objectId, objectId,
    );
    if (!attachments) throw new Error('Event not found or object archived');
    const result = await tx.runAsync('DELETE FROM events WHERE id = ? AND object_id = ?', id, objectId);
    if (result.changes !== 1) throw new Error('Event not found');
  });
  // Cleanup is best-effort and must never change the result of a committed deletion.
  const files = attachments as { photo: string | null; document_file: string | null } | null;
  if (!files) return;
  try {
    if (files.photo) {
      const used = await db.getFirstAsync<{ used: number }>('SELECT 1 AS used WHERE EXISTS (SELECT 1 FROM events WHERE photo = ?) OR EXISTS (SELECT 1 FROM objects WHERE cover_image = ?)', files.photo, files.photo);
      if (!used) await removePhoto(files.photo);
    }
  } catch { /* Keep orphaned files when cleanup cannot be confirmed. */ }
  try {
    if (files.document_file) {
      const used = await db.getFirstAsync<{ used: number }>('SELECT 1 AS used WHERE EXISTS (SELECT 1 FROM events WHERE document_file = ?)', files.document_file);
      if (!used) await removeDocument(files.document_file);
    }
  } catch { /* Cleanup can be retried separately. */ }
}
