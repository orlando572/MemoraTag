import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { AppConfig, CONFIG, loadConfig, PG_POOL } from './config';

// Global config and (optional) Postgres pool shared by every module.
@Global()
@Module({
  providers: [
    { provide: CONFIG, useFactory: () => loadConfig() },
    { provide: PG_POOL, inject: [CONFIG], useFactory: (c: AppConfig) => (c.persistence === 'postgres' ? new Pool({ connectionString: c.databaseUrl }) : null) },
  ],
  exports: [CONFIG, PG_POOL],
})
export class PersistenceModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool | null) {}
  async onApplicationShutdown() {
    await this.pool?.end();
  }
}
