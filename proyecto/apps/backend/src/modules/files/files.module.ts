import { forwardRef, Logger, Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { AppConfig, CONFIG, PG_POOL } from '../../config';
import { MEMBERSHIP_READER, MembershipReader, OBJECT_REPOSITORY, ObjectRepository } from '../objects/application/ports';
import { ORGANIZATION_REPOSITORY } from '../organizations/application/ports';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ObjectsModule } from '../objects/objects.module';
import { FilesController } from './adapters/in/http/files.controller';
import { MemoryEventFileRepository } from './adapters/out/memory/memory-event-file.repository';
import { MemoryFileStorage } from './adapters/out/memory/memory-file-storage';
import { PgEventFileRepository } from './adapters/out/postgres/pg-event-file.repository';
import { SupabaseFileStorage } from './adapters/out/supabase-file-storage';
import { FilesService } from './application/files.service';
import { EVENT_FILE_REPOSITORY, EventFileRepository, FILE_STORAGE, FileStorage } from './application/ports';

const logger = new Logger('Files');

@Module({
  imports: [OrganizationsModule, forwardRef(() => ObjectsModule)],
  controllers: [FilesController],
  providers: [
    { provide: EVENT_FILE_REPOSITORY, inject: [CONFIG, PG_POOL], useFactory: (c: AppConfig, pool: Pool | null) => (c.persistence === 'postgres' && pool ? new PgEventFileRepository(pool) : new MemoryEventFileRepository()) },
    { provide: FILE_STORAGE, inject: [CONFIG], useFactory: (c: AppConfig) => (c.persistence === 'postgres' ? new SupabaseFileStorage(c.supabaseUrl, c.supabaseServiceRoleKey, c.supabasePublicUrl) : new MemoryFileStorage()) },
    { provide: MEMBERSHIP_READER, useExisting: ORGANIZATION_REPOSITORY },
    {
      provide: FilesService,
      inject: [EVENT_FILE_REPOSITORY, FILE_STORAGE, OBJECT_REPOSITORY, MEMBERSHIP_READER],
      useFactory: (f: EventFileRepository, s: FileStorage, o: ObjectRepository, m: MembershipReader) => new FilesService(f, s, o, m, (msg) => logger.warn(msg)),
    },
  ],
  exports: [EVENT_FILE_REPOSITORY],
})
export class FilesModule {}
