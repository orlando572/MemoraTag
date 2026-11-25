import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { AppConfig, CONFIG, PG_POOL } from '../../config';
import { ORGANIZATION_REPOSITORY } from '../organizations/application/ports';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ObjectsController } from './adapters/in/http/objects.controller';
import { MemoryObjectRepository } from './adapters/out/memory/memory-object.repository';
import { PgObjectRepository } from './adapters/out/postgres/pg-object.repository';
import { ObjectsService } from './application/objects.service';
import { MEMBERSHIP_READER, MembershipReader, OBJECT_REPOSITORY, ObjectRepository } from './application/ports';

@Module({
  imports: [OrganizationsModule],
  controllers: [ObjectsController],
  providers: [
    { provide: OBJECT_REPOSITORY, inject: [CONFIG, PG_POOL], useFactory: (c: AppConfig, pool: Pool | null) => (c.persistence === 'postgres' && pool ? new PgObjectRepository(pool) : new MemoryObjectRepository()) },
    { provide: MEMBERSHIP_READER, useExisting: ORGANIZATION_REPOSITORY },
    { provide: ObjectsService, inject: [OBJECT_REPOSITORY, MEMBERSHIP_READER], useFactory: (r: ObjectRepository, m: MembershipReader) => new ObjectsService(r, m) },
  ],
})
export class ObjectsModule {}
