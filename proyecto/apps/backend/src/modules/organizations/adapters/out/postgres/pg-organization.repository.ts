import type { Pool } from 'pg';
import type { Role } from '@memoratag/contracts';
import type { Organization } from '../../../domain/organization';
import type { OrganizationRepository } from '../../../application/ports';

const iso = (d: Date | string) => new Date(d).toISOString();

export class PgOrganizationRepository implements OrganizationRepository {
  constructor(private readonly pool: Pool) {}

  async create(org: Organization, adminUserId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('insert into organizations (id, name, created_at) values ($1, $2, $3)', [org.id, org.name, org.created_at]);
      await client.query("insert into organization_members (organization_id, user_id, role) values ($1, $2, 'admin')", [org.id, adminUserId]);
      await client.query('commit');
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }
  async rename(orgId: string, name: string): Promise<Organization> {
    const r = await this.pool.query('update organizations set name = $2 where id = $1 and deleted_at is null returning id, name, created_at', [orgId, name]);
    return { id: r.rows[0].id, name: r.rows[0].name, created_at: iso(r.rows[0].created_at) };
  }
  async listForUser(userId: string) {
    const r = await this.pool.query(
      `select o.id, o.name, o.created_at, m.role from organizations o
       join organization_members m on m.organization_id = o.id and m.deleted_at is null
       where m.user_id = $1 and o.deleted_at is null order by o.created_at`,
      [userId],
    );
    return r.rows.map((x) => ({ id: x.id, name: x.name, created_at: iso(x.created_at), role: x.role as Role }));
  }
  async getRole(orgId: string, userId: string) {
    const r = await this.pool.query(
      `select m.role from organization_members m join organizations o on o.id = m.organization_id and o.deleted_at is null
       where m.organization_id = $1 and m.user_id = $2 and m.deleted_at is null`,
      [orgId, userId],
    );
    return (r.rows[0]?.role as Role | undefined) ?? null;
  }
  async listMembers(orgId: string) {
    const r = await this.pool.query('select user_id, role from organization_members where organization_id = $1 and deleted_at is null order by created_at', [orgId]);
    return r.rows as { user_id: string; role: Role }[];
  }
  async addMember(orgId: string, userId: string, role: Role) {
    await this.pool.query('insert into organization_members (organization_id, user_id, role) values ($1, $2, $3)', [orgId, userId, role]);
  }
  async setRole(orgId: string, userId: string, role: Role) {
    await this.pool.query('update organization_members set role = $3 where organization_id = $1 and user_id = $2 and deleted_at is null', [orgId, userId, role]);
  }
  async removeMember(orgId: string, userId: string) {
    await this.pool.query('update organization_members set deleted_at = now() where organization_id = $1 and user_id = $2 and deleted_at is null', [orgId, userId]);
  }
}
