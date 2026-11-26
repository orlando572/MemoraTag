import { Global, Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { AppConfig, CONFIG, PG_POOL } from '../../config';
import { AuthGuard } from './adapters/in/http/auth.guard';
import { JoseTokenVerifier } from './adapters/out/jose-token-verifier';
import { MemoryUserDirectory } from './adapters/out/memory/memory-user-directory';
import { PgUserDirectory } from './adapters/out/postgres/pg-user-directory';
import { TOKEN_VERIFIER, USER_DIRECTORY } from './application/ports';

@Global()
@Module({
  providers: [
    { provide: TOKEN_VERIFIER, inject: [CONFIG], useFactory: (c: AppConfig) => new JoseTokenVerifier(c.supabaseUrl) },
    { provide: USER_DIRECTORY, inject: [CONFIG, PG_POOL], useFactory: (c: AppConfig, pool: Pool | null) => (c.persistence === 'postgres' && pool ? new PgUserDirectory(pool) : new MemoryUserDirectory()) },
    AuthGuard,
  ],
  exports: [TOKEN_VERIFIER, USER_DIRECTORY, AuthGuard],
})
export class IdentityModule {}
