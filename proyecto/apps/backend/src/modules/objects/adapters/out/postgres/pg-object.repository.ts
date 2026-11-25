import type { Pool } from 'pg';
import type { InventoryObject, InventoryStatus, ObjectEvent, ObjectFilters, OrganizationSummary } from '@memoratag/contracts';
import type { ObjectPatch, ObjectRepository } from '../../../application/ports';

const iso = (d: Date | string | null) => (d ? new Date(d).toISOString() : null);
const like = (s: string) => `%${s.replace(/[\\%_]/g, '\\$&')}%`;
const COLS = 'id, organization_id, name, description, color, internal_code, category, location, assignee, status, created_at, archived_at';
const PATCHABLE = ['name', 'description', 'color', 'internal_code', 'category', 'location', 'assignee'] as const;

const toObject = (r: any): InventoryObject => ({ ...r, created_at: iso(r.created_at)!, archived_at: iso(r.archived_at) });
const toEvent = (r: any): ObjectEvent => ({ ...r, event_date: iso(r.event_date), created_at: iso(r.created_at)! });

export class PgObjectRepository implements ObjectRepository {
  constructor(private readonly pool: Pool) {}

  async create(o: InventoryObject) {
    await this.pool.query(
      `insert into objects (id, organization_id, name, description, color, internal_code, category, location, assignee, status, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [o.id, o.organization_id, o.name, o.description, o.color, o.internal_code ?? null, o.category ?? null, o.location ?? null, o.assignee ?? null, o.status, o.created_at],
    );
  }
  async getById(id: string) {
    const r = await this.pool.query(`select ${COLS} from objects where id = $1 and deleted_at is null`, [id]);
    return r.rows[0] ? toObject(r.rows[0]) : null;
  }
  async list(orgId: string, f: ObjectFilters) {
    const where = ['organization_id = $1', 'deleted_at is null', 'archived_at is null'];
    const args: unknown[] = [orgId];
    const add = (sql: string, value: unknown) => {
      args.push(value);
      where.push(sql.replace('$n', `$${args.length}`));
    };
    if (f.status) add('status = $n', f.status);
    if (f.location) add('location ilike $n', like(f.location));
    if (f.category) add('lower(category) = lower($n)', f.category);
    if (f.q) add(`(name ilike $n or internal_code ilike $n or location ilike $n)`, like(f.q));
    const r = await this.pool.query(`select ${COLS} from objects where ${where.join(' and ')} order by created_at`, args);
    return r.rows.map(toObject);
  }
  async update(id: string, patch: ObjectPatch) {
    const keys = PATCHABLE.filter((k) => k in patch);
    const sets = keys.map((k, i) => `${k} = $${i + 2}`);
    const r = await this.pool.query(`update objects set ${[...sets, 'updated_at = now()'].join(', ')} where id = $1 returning ${COLS}`, [id, ...keys.map((k) => patch[k] ?? null)]);
    return toObject(r.rows[0]);
  }
  async setStatus(id: string, status: InventoryStatus) {
    const r = await this.pool.query(`update objects set status = $2, updated_at = now() where id = $1 returning ${COLS}`, [id, status]);
    return toObject(r.rows[0]);
  }
  async archive(id: string, at: string) {
    const r = await this.pool.query(`update objects set archived_at = $2, updated_at = now() where id = $1 returning ${COLS}`, [id, at]);
    return toObject(r.rows[0]);
  }
  async listEvents(objectId: string) {
    const r = await this.pool.query('select id, object_id, type, title, description, event_date, created_at, created_by from events where object_id = $1 and deleted_at is null order by created_at desc', [objectId]);
    return r.rows.map(toEvent);
  }
  async addEvent(e: ObjectEvent) {
    await this.pool.query('insert into events (id, object_id, type, title, description, event_date, created_at, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8)', [e.id, e.object_id, e.type, e.title, e.description, e.event_date ?? null, e.created_at, e.created_by]);
  }
  async summary(orgId: string): Promise<OrganizationSummary> {
    const base = 'o.organization_id = $1 and o.deleted_at is null and o.archived_at is null';
    const [status, incidents, recent] = await Promise.all([
      this.pool.query(`select o.status, count(*)::int as n from objects o where ${base} group by o.status`, [orgId]),
      this.pool.query(
        `select coalesce(sum(greatest(0, t.issues - t.resolved)), 0)::int as n from (
           select count(*) filter (where e.type = 'issue') as issues, count(*) filter (where e.type = 'resolved') as resolved
           from objects o join events e on e.object_id = o.id and e.deleted_at is null where ${base} group by o.id) t`,
        [orgId],
      ),
      this.pool.query(
        `select e.id, e.object_id, e.type, e.title, e.description, e.event_date, e.created_at, e.created_by
         from events e join objects o on o.id = e.object_id where ${base} and e.deleted_at is null order by e.created_at desc limit 10`,
        [orgId],
      ),
    ]);
    const by_status: Record<InventoryStatus, number> = { in_use: 0, in_repair: 0, retired: 0 };
    for (const row of status.rows) by_status[row.status as InventoryStatus] = row.n;
    return { total: Object.values(by_status).reduce((a, b) => a + b, 0), by_status, open_incidents: incidents.rows[0].n, recent_events: recent.rows.map(toEvent) };
  }
}
