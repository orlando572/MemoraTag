import { randomUUID } from 'node:crypto';
import { MAX_FILE_BYTES } from '@memoratag/contracts';
import type { EventFile } from '@memoratag/contracts';
import type { CurrentUser } from '../../identity/domain/current-user';
import type { MembershipReader, ObjectRepository } from '../../objects/application/ports';
import { ConflictError, ForbiddenError, InvalidInputError, NotFoundError, PayloadTooLargeError } from '../../../shared/errors';
import { fileKind, matchesSignature, sanitizeName, storagePath } from '../domain/file-rules';
import type { EventFileRepository, FileStorage, StoredEventFile } from './ports';

export const SIGNED_URL_SECONDS = 300;

export interface UploadInput {
  name: string;
  mime: string;
  bytes: Buffer;
}

/** Use cases for event attachments. Authorization is always membership of the object's organization. */
export class FilesService {
  constructor(
    private readonly files: EventFileRepository,
    private readonly storage: FileStorage,
    private readonly objects: ObjectRepository,
    private readonly memberships: MembershipReader,
    private readonly log: (message: string) => void = () => undefined,
  ) {}

  async upload(user: CurrentUser, eventId: string, input: UploadInput): Promise<EventFile> {
    const event = await this.objects.getEventById(eventId);
    const object = event ? await this.objects.getById(event.object_id) : null;
    const role = object?.organization_id ? await this.memberships.getRole(object.organization_id, user.id) : null;
    if (!event || !object?.organization_id || !role) throw new NotFoundError('Event not found');
    if (object.archived_at) throw new ConflictError('Object is archived');

    const kind = fileKind(input.mime);
    if (!kind) throw new InvalidInputError('File type not allowed');
    if (input.bytes.length === 0) throw new InvalidInputError('File is empty');
    if (input.bytes.length > MAX_FILE_BYTES) throw new PayloadTooLargeError('File exceeds 5 MB');
    if (!matchesSignature(input.mime, input.bytes)) throw new InvalidInputError('File content does not match its type');

    const id = randomUUID();
    const path = storagePath(object.organization_id, object.id, event.id, id);
    await this.storage.put(path, input.bytes, input.mime);
    const file: StoredEventFile = {
      id,
      event_id: event.id,
      kind,
      name: sanitizeName(input.name),
      mime: input.mime,
      size: input.bytes.length,
      created_at: new Date().toISOString(),
      created_by: user.id,
      organization_id: object.organization_id,
      object_id: object.id,
      storage_path: path,
    };
    try {
      await this.files.add(file);
    } catch (e) {
      await this.storage.remove(path).catch(() => undefined);
      throw e;
    }
    return toPublic(file);
  }

  async signedUrl(user: CurrentUser, fileId: string) {
    const { file } = await this.load(user, fileId);
    return { url: await this.storage.signedUrl(file.storage_path, SIGNED_URL_SECONDS), expires_in: SIGNED_URL_SECONDS };
  }

  async remove(user: CurrentUser, fileId: string) {
    const { file, role } = await this.load(user, fileId);
    if (role !== 'admin') throw new ForbiddenError('Admin role required');
    await this.files.softDelete(file.id);
    try {
      await this.storage.remove(file.storage_path);
    } catch (e) {
      this.log(`Storage removal failed for file ${file.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Non-members get 404 so existence is not leaked. */
  private async load(user: CurrentUser, fileId: string) {
    const file = await this.files.getById(fileId);
    const role = file ? await this.memberships.getRole(file.organization_id, user.id) : null;
    if (!file || !role) throw new NotFoundError('File not found');
    return { file, role };
  }
}

function toPublic(f: StoredEventFile): EventFile {
  return { id: f.id, event_id: f.event_id, kind: f.kind, name: f.name, mime: f.mime, size: f.size, created_at: f.created_at, created_by: f.created_by };
}
