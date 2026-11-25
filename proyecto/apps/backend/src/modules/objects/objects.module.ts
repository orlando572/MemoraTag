import { forwardRef, Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { AppConfig, CONFIG, PG_POOL } from '../../config';
import { USER_DIRECTORY, UserDirectory } from '../identity/application/ports';
import { ORGANIZATION_REPOSITORY } from '../organizations/application/ports';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ObjectsController } from './adapters/in/http/objects.controller';
import { MemoryObjectRepository } from './adapters/out/memory/memory-object.repository';
import { PgObjectRepository } from './adapters/out/postgres/pg-object.repository';
import { ObjectsService } from './application/objects.service';
import { EVENT_FILE_REPOSITORY } from '../files/application/ports';
import { FilesModule } from '../files/files.module';
import { EVENT_FILE_READER, EventFileReader, MEMBERSHIP_READER, MembershipReader, OBJECT_REPOSITORY, ObjectRepository } from './application/ports';

@Module({
  imports: [OrganizationsModule, forwardRef(() => FilesModule)],
  controllers: [ObjectsController],
  providers: [
    { provide: OBJECT_REPOSITORY, inject: [CONFIG, PG_POOL], useFactory: (c: AppConfig, pool: Pool | null) => (c.persistence === 'postgres' && pool ? new PgObjectRepository(pool) : new MemoryObjectRepository()) },
    { provide: MEMBERSHIP_READER, useExisting: ORGANIZATION_REPOSITORY },
    { provide: EVENT_FILE_READER, useExisting: EVENT_FILE_REPOSITORY },
    { provide: ObjectsService, inject: [OBJECT_REPOSITORY, MEMBERSHIP_READER, EVENT_FILE_READER, USER_DIRECTORY], useFactory: (r: ObjectRepository, m: MembershipReader, f: EventFileReader, u: UserDirectory) => new ObjectsService(r, m, f, u) },
  ],
  exports: [OBJECT_REPOSITORY],
})
export class ObjectsModule {}
