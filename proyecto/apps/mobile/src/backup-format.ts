// Format v1 is a bounded JSON document; it is not a ZIP and is not encrypted.
// Digests are SHA-256 of the canonical base64 text, encoded as lowercase hex.
export const BACKUP_LIMITS = { jsonBytes: 32 * 1024 * 1024, totalBytes: 20 * 1024 * 1024, fileBytes: 5 * 1024 * 1024, objects: 5000, events: 20000, files: 10000 } as const;

export type BackupFile = { key: string; size: number; sha256: string; base64: string };
export type BackupObject = { id: string; name: string; description: string; created_at: string; archived_at: string | null; cover_image: string | null; color: string; nfc_written_at?: string | null };
export type BackupEvent = { id: string; object_id: string; title: string; description: string; created_at: string; type: 'note' | 'issue' | 'maintenance'; event_date: string; photo: string | null; document_file: string | null; document_name: string | null };
export type Backup = { format: 'memoratag-backup'; version: 1; appVersion: string; exportedAt: string; profile: { name: string } | null; objects: BackupObject[]; events: BackupEvent[]; files: BackupFile[] };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const imageName = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|heic|heif)$/i;
const documentName = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|xls|xlsx)$/i;
const hash = /^[a-f0-9]{64}$/;
const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function fail(): never { throw new Error('INVALID_BACKUP'); }
function isObject(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function text(value: unknown, max: number): value is string { return typeof value === 'string' && value.length <= max; }
function timestamp(value: unknown): value is string { return text(value, 40) && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)); }
function date(value: unknown): value is string {
  if (!text(value, 10) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function validateBackup(input: unknown, sha256: (base64: string) => Promise<string>): Promise<Backup> {
  if (!isObject(input) || input.format !== 'memoratag-backup' || input.version !== 1 || !text(input.appVersion, 100) || !timestamp(input.exportedAt) || !Array.isArray(input.objects) || !Array.isArray(input.events) || !Array.isArray(input.files)) fail();
  if (input.objects.length > BACKUP_LIMITS.objects || input.events.length > BACKUP_LIMITS.events || input.files.length > BACKUP_LIMITS.files) fail();
  if (input.profile !== null && (!isObject(input.profile) || !text(input.profile.name, 60) || !input.profile.name.trim())) fail();
  const objectIds = new Set<string>();
  const eventIds = new Set<string>();
  const references = new Set<string>();

  for (const object of input.objects) {
    if (!isObject(object) || !text(object.id, 36) || !uuid.test(object.id) || object.id !== object.id.toLowerCase() || objectIds.has(object.id) || !text(object.name, 120) || !object.name.trim() || !text(object.description, 100000) || !timestamp(object.created_at) || (object.archived_at !== null && !timestamp(object.archived_at)) || !text(object.color, 7) || !/^#[0-9a-f]{6}$/i.test(object.color) || (object.cover_image !== null && (!text(object.cover_image, 50) || !imageName.test(object.cover_image))) || (object.nfc_written_at != null && !timestamp(object.nfc_written_at))) fail();
    objectIds.add(object.id.toLowerCase());
    if (object.cover_image) references.add(`photos/${object.cover_image}`);
  }
  for (const event of input.events) {
    if (!isObject(event) || !text(event.id, 36) || !uuid.test(event.id) || event.id !== event.id.toLowerCase() || eventIds.has(event.id) || !text(event.object_id, 36) || event.object_id !== event.object_id.toLowerCase() || !objectIds.has(event.object_id) || !text(event.title, 120) || !event.title.trim() || !text(event.description, 100000) || !timestamp(event.created_at) || !date(event.event_date) || typeof event.type !== 'string' || !['note', 'issue', 'maintenance'].includes(event.type) || (event.photo !== null && (!text(event.photo, 50) || !imageName.test(event.photo))) || (event.document_file !== null && (!text(event.document_file, 50) || !documentName.test(event.document_file))) || (event.document_name !== null && (!text(event.document_name, 255) || !event.document_name.trim())) || (event.document_file === null) !== (event.document_name === null)) fail();
    eventIds.add(event.id.toLowerCase());
    if (event.photo) references.add(`photos/${event.photo}`);
    if (event.document_file) references.add(`documents/${event.document_file}`);
  }
  const fileKeys = new Set<string>();
  let total = 0;
  for (const file of input.files) {
    if (!isObject(file) || !text(file.key, 65) || !references.has(file.key) || fileKeys.has(file.key) || !Number.isSafeInteger(file.size) || (file.size as number) < 0 || (file.size as number) > BACKUP_LIMITS.fileBytes || !text(file.sha256, 64) || !hash.test(file.sha256) || !text(file.base64, Math.ceil(BACKUP_LIMITS.fileBytes / 3) * 4) || !base64Pattern.test(file.base64)) fail();
    const padding = file.base64.endsWith('==') ? 2 : file.base64.endsWith('=') ? 1 : 0;
    if (file.base64.length / 4 * 3 - padding !== file.size) fail();
    total += file.size as number;
    if (total > BACKUP_LIMITS.totalBytes || await sha256(file.base64) !== file.sha256) fail();
    fileKeys.add(file.key);
  }
  if (fileKeys.size !== references.size) fail();
  return input as Backup;
}
