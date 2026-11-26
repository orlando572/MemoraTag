import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { IdentityModule } from './modules/identity/identity.module';
import { ObjectsModule } from './modules/objects/objects.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PersistenceModule } from './persistence.module';
import { DomainExceptionFilter } from './shared/http';

@Module({
  imports: [PersistenceModule, IdentityModule, OrganizationsModule, ObjectsModule],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class AppModule {}
