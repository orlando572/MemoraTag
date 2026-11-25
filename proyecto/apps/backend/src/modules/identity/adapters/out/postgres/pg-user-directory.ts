import type { Pool } from 'pg';
import type { CurrentUser } from '../../../domain/current-user';
import type { UserDirectory } from '../../../application/ports';

export class PgUserDirectory implements UserDirectory {
  constructor(private readonly pool: Pool) {}

  async remember() {}
  async findByEmail(email: string): Promise<CurrentUser | null> {
    const r = await this.pool.query('select id, email from profiles where lower(email) = lower($1) and deleted_at is null', [email]);
    return r.rows[0] ?? null;
  }
  async findByIds(ids: string[]): Promise<CurrentUser[]> {
    if (!ids.length) return [];
    const r = await this.pool.query('select id, email from profiles where id = any($1::uuid[])', [ids]);
    return r.rows;
  }
}
