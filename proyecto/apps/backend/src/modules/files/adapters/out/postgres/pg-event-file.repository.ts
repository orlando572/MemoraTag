import type { Pool } from 'pg';
import type { EventFile } from '@memoratag/contracts';
import type { EventFileRepository, StoredEventFile } from '../../../application/ports';

const COLS = 'id, event_id, organization_id, object_id, kind, name, mime, size, storage_path, created_by, created_at';
const iso = (d: Date | string) => new Date(d).toISOString();
const toStored = (r: any): StoredEventFile => ({ ...r, created_at: iso(r.created_at) });

export class PgEventFileRepository implements EventFileRepository {
  constructor(private readonly pool: Pool) {}

  async add(f: StoredEventFile) {
    await this.pool.query(`insert into event_files (${COLS}) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
      f.id, f.event_id, f.organization_id, f.object_id, f.kind, f.name, f.mime, f.size, f.storage_path, f.created_by, f.created_at,
    ]);
  }
  async getById(id: string) {
    const r = await this.pool.query(`select ${COLS} from event_files where id = $1 and deleted_at is null`, [id]);
    return r.rows[0] ? toStored(r.rows[0]) : null;
  }
  async listByEvents(eventIds: string[]): Promise<EventFile[]> {
    if (!eventIds.length) return [];
    const r = await this.pool.query(
      'select id, event_id, kind, name, mime, size, created_by, created_at from event_files where event_id = any($1::uuid[]) and deleted_at is null order by created_at',
      [eventIds],
    );
    return r.rows.map((x) => ({ ...x, created_at: iso(x.created_at) }));
  }
  async softDelete(id: string) {
    await this.pool.query('update event_files set deleted_at = now() where id = $1 and deleted_at is null', [id]);
  }
}
