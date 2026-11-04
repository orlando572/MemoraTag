import type { BackupEvent, BackupObject } from './backup-format';

type Run = (sql: string, ...values: (string | null)[]) => Promise<unknown>;

// The caller must run this function inside an exclusive transaction.
export async function writeBackupRows(run: Run, objects: BackupObject[], events: BackupEvent[], profileName: string | null) {
  for (const object of objects) await run(`INSERT INTO objects (id, name, description, created_at, archived_at, cover_image, color) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, created_at=excluded.created_at, archived_at=excluded.archived_at, cover_image=excluded.cover_image, color=excluded.color`, object.id, object.name, object.description, object.created_at, object.archived_at, object.cover_image, object.color);
  for (const event of events) await run(`INSERT INTO events (id, object_id, title, description, created_at, type, event_date, photo, document_file, document_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET object_id=excluded.object_id, title=excluded.title, description=excluded.description, created_at=excluded.created_at, type=excluded.type, event_date=excluded.event_date, photo=excluded.photo, document_file=excluded.document_file, document_name=excluded.document_name`, event.id, event.object_id, event.title, event.description, event.created_at, event.type, event.event_date, event.photo, event.document_file, event.document_name);
  if (profileName !== null) await run('INSERT INTO local_profile (id, name) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name', profileName);
}
