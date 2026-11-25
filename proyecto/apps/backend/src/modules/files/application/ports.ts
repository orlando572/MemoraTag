import type { EventFile } from '@memoratag/contracts';

export const FILE_STORAGE = Symbol('FILE_STORAGE');
export const EVENT_FILE_REPOSITORY = Symbol('EVENT_FILE_REPOSITORY');

/** Private blob storage. Paths are built by the backend, never from user input. */
export interface FileStorage {
  put(path: string, bytes: Buffer, mime: string): Promise<void>;
  signedUrl(path: string, seconds: number): Promise<string>;
  remove(path: string): Promise<void>;
}

export interface StoredEventFile extends EventFile {
  organization_id: string;
  object_id: string;
  storage_path: string;
}

export interface EventFileRepository {
  add(file: StoredEventFile): Promise<void>;
  /** Non-deleted file or null. */
  getById(id: string): Promise<StoredEventFile | null>;
  /** Non-deleted files of the given events, oldest first. */
  listByEvents(eventIds: string[]): Promise<EventFile[]>;
  softDelete(id: string): Promise<void>;
}
