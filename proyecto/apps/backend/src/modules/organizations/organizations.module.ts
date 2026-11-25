import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { AppConfig, CONFIG, PG_POOL } from '../../config';
import { USER_DIRECTORY, UserDirectory } from '../identity/application/ports';
import { OrganizationsController } from './adapters/in/http/organizations.controller';
import { MemoryOrganizationRepository } from './adapters/out/memory/memory-organization.repository';
import { PgOrganizationRepository } from './adapters/out/postgres/pg-organization.repository';
import { OrganizationsService } from './application/organizations.service';
import { ORGANIZATION_REPOSITORY, OrganizationRepository } from './application/ports';

@Module({
  controllers: [OrganizationsController],
  providers: [
    { provide: ORGANIZATION_REPOSITORY, inject: [CONFIG, PG_POOL], useFactory: (c: AppConfig, pool: Pool | null) => (c.persistence === 'postgres' && pool ? new PgOrganizationRepository(pool) : new MemoryOrganizationRepository()) },
    { provide: OrganizationsService, inject: [ORGANIZATION_REPOSITORY, USER_DIRECTORY], useFactory: (r: OrganizationRepository, u: UserDirectory) => new OrganizationsService(r, u) },
  ],
  exports: [ORGANIZATION_REPOSITORY],
})
export class OrganizationsModule {}
