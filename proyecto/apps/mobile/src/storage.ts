import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

export type MemoryObject = { id: string; name: string; description: string; created_at: string; cover_image: string | null };
export type EventType = 'note' | 'issue' | 'maintenance';
export type MemoryEvent = { id: string; object_id: string; title: string; description: string; created_at: string; type: EventType; event_date: string; photo: string | null; document_file: string | null; document_name: string | null };

let database: Promise<SQLite.SQLiteDatabase> | undefined;

export function openDatabase() {
  if (!database) {
    database = SQLite.openDatabaseAsync('memoratag.db').then(async (db) => {
      await db.execAsync(`PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS objects (
          id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL,
          description TEXT NOT NULL, created_at TEXT NOT NULL, archived_at TEXT, cover_image TEXT
        );
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY NOT NULL, object_id TEXT NOT NULL REFERENCES objects(id),
          title TEXT NOT NULL, description TEXT NOT NULL, created_at TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'note', event_date TEXT, photo TEXT, document_file TEXT, document_name TEXT
        );`);
      // Preserve databases created before objects could be archived.
      const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(objects)');
      if (!columns.some((column) => column.name === 'archived_at')) {
        await db.execAsync('ALTER TABLE objects ADD COLUMN archived_at TEXT');
      }
      if (!columns.some((column) => column.name === 'cover_image')) {
        await db.execAsync('ALTER TABLE objects ADD COLUMN cover_image TEXT');
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
      await db.execAsync("UPDATE events SET event_date = date(created_at, 'localtime') WHERE event_date IS NULL");
      return db;
    }).catch((error) => {
      database = undefined;
      throw error;
    });
  }
  return database;
}

// UUIDs are created on the device and remain unchanged if data is synced later.
function newId() {
  return Crypto.randomUUID();
}

export async function listObjects() {
  return (await openDatabase()).getAllAsync<MemoryObject>('SELECT * FROM objects WHERE archived_at IS NULL ORDER BY created_at DESC');
}

export async function listArchivedObjects() {
  return (await openDatabase()).getAllAsync<MemoryObject>('SELECT * FROM objects WHERE archived_at IS NOT NULL ORDER BY archived_at DESC');
}

export async function findActiveObject(id: string) {
  return (await openDatabase()).getFirstAsync<MemoryObject>('SELECT id, name, description, created_at, cover_image FROM objects WHERE id = ? AND archived_at IS NULL', id);
}

export async function listEvents(objectId: string) {
  return (await openDatabase()).getAllAsync<MemoryEvent>('SELECT * FROM events WHERE object_id = ? ORDER BY event_date DESC, created_at DESC', objectId);
}

export async function createObject(name: string, description: string, coverImage: string | null) {
  await (await openDatabase()).runAsync('INSERT INTO objects (id, name, description, created_at, cover_image) VALUES (?, ?, ?, ?, ?)', newId(), name, description, new Date().toISOString(), coverImage);
}

export async function updateObject(id: string, name: string, description: string, coverImage: string | null) {
  const result = await (await openDatabase()).runAsync('UPDATE objects SET name = ?, description = ?, cover_image = ? WHERE id = ? AND archived_at IS NULL', name, description, coverImage, id);
  if (result.changes !== 1) throw new Error('Object not found or archived');
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
    'UPDATE events SET title = ?, description = ?, type = ?, event_date = ?, photo = ?, document_file = ?, document_name = ? WHERE id = ? AND object_id = ? AND EXISTS (SELECT 1 FROM objects WHERE id = ? AND archived_at IS NULL)',
    event.title, event.description, event.type, event.event_date, event.photo, event.document_file, event.document_name, event.id, event.object_id, event.object_id,
  );
  if (result.changes !== 1) throw new Error('Event not found or object archived');
}
