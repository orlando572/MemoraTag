import type { Backup, BackupEvent, BackupFile, BackupObject } from './backup-format';

export type BackupConflict<T> = { current: T; incoming: T; fields: string[] };
export type BackupPlan = {
  newObjects: BackupObject[];
  newEvents: BackupEvent[];
  objectConflicts: BackupConflict<BackupObject>[];
  eventConflicts: BackupConflict<BackupEvent>[];
  unchangedObjects: number;
  unchangedEvents: number;
  archiveChanges: number;
  profileChanged: boolean;
};

function fileDigest(files: Map<string, BackupFile>, kind: 'photos' | 'documents', name: string | null) {
  return name === null ? null : files.get(`${kind}/${name}`)?.sha256 ?? null;
}

// Inputs must be validated first. Compare file contents rather than private
// filenames, so a backup imported twice does not produce false conflicts.
export function planBackupMerge(current: Backup, incoming: Backup): BackupPlan {
  const currentObjects = new Map(current.objects.map((item) => [item.id.toLowerCase(), item]));
  const currentEvents = new Map(current.events.map((item) => [item.id.toLowerCase(), item]));
  const currentFiles = new Map(current.files.map((item) => [item.key, item]));
  const incomingFiles = new Map(incoming.files.map((item) => [item.key, item]));
  const result: BackupPlan = { newObjects: [], newEvents: [], objectConflicts: [], eventConflicts: [], unchangedObjects: 0, unchangedEvents: 0, archiveChanges: 0, profileChanged: (current.profile?.name ?? null) !== (incoming.profile?.name ?? null) };

  for (const item of incoming.objects) {
    const existing = currentObjects.get(item.id.toLowerCase());
    if (!existing) { result.newObjects.push(item); continue; }
    const fields: string[] = [];
    for (const field of ['name', 'description', 'created_at', 'archived_at', 'color'] as const) if (existing[field] !== item[field]) fields.push(field);
    if (item.icon !== undefined && (existing.icon ?? null) !== item.icon) fields.push('icon');
    if (fileDigest(currentFiles, 'photos', existing.cover_image) !== fileDigest(incomingFiles, 'photos', item.cover_image)) fields.push('cover_image');
    if (!fields.length) result.unchangedObjects++;
    else {
      if ((existing.archived_at === null) !== (item.archived_at === null)) result.archiveChanges++;
      result.objectConflicts.push({ current: existing, incoming: item, fields });
    }
  }
  for (const item of incoming.events) {
    const existing = currentEvents.get(item.id.toLowerCase());
    if (!existing) { result.newEvents.push(item); continue; }
    const fields: string[] = [];
    for (const field of ['object_id', 'title', 'description', 'created_at', 'type', 'event_date', 'document_name'] as const) if (existing[field] !== item[field]) fields.push(field);
    if (item.resolved_at !== undefined && (existing.resolved_at ?? null) !== item.resolved_at) fields.push('resolved_at');
    if (fileDigest(currentFiles, 'photos', existing.photo) !== fileDigest(incomingFiles, 'photos', item.photo)) fields.push('photo');
    if (fileDigest(currentFiles, 'documents', existing.document_file) !== fileDigest(incomingFiles, 'documents', item.document_file)) fields.push('document_file');
    if (!fields.length) result.unchangedEvents++;
    else result.eventConflicts.push({ current: existing, incoming: item, fields });
  }
  return result;
}
