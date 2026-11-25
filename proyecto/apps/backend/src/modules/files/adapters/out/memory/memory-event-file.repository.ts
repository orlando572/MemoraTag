import type { EventFileRepository, StoredEventFile } from '../../../application/ports';

const publicFields = ({ id, event_id, kind, name, mime, size, created_at, created_by }: StoredEventFile) => ({ id, event_id, kind, name, mime, size, created_at, created_by });

export class MemoryEventFileRepository implements EventFileRepository {
  private readonly files = new Map<string, StoredEventFile>();

  async add(file: StoredEventFile) {
    this.files.set(file.id, { ...file });
  }
  async getById(id: string) {
    return this.files.get(id) ?? null;
  }
  async listByEvents(eventIds: string[]) {
    return [...this.files.values()].filter((f) => eventIds.includes(f.event_id)).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(publicFields);
  }
  async softDelete(id: string) {
    this.files.delete(id);
  }
}
