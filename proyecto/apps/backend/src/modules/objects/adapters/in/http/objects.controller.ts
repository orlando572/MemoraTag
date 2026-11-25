import { Body, Controller, Get, Header, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ChangeStatusSchema, CreateEventSchema, CreateObjectSchema, ObjectFiltersSchema, UpdateObjectSchema } from '@memoratag/contracts';
import type { ChangeStatusInput, CreateEventInput, CreateObjectInput, ObjectFilters, UpdateObjectInput } from '@memoratag/contracts';
import { AuthGuard, CurrentUser } from '../../../../identity/adapters/in/http/auth.guard';
import type { CurrentUser as User } from '../../../../identity/domain/current-user';
import { ZodPipe } from '../../../../../shared/http';
import { ObjectsService } from '../../../application/objects.service';

@Controller()
@UseGuards(AuthGuard)
export class ObjectsController {
  constructor(private readonly service: ObjectsService) {}

  @Get('organizations/:orgId/objects')
  list(@CurrentUser() user: User, @Param('orgId') orgId: string, @Query(new ZodPipe(ObjectFiltersSchema)) filters: ObjectFilters) {
    return this.service.list(user, orgId, filters);
  }

  @Post('organizations/:orgId/objects')
  create(@CurrentUser() user: User, @Param('orgId') orgId: string, @Body(new ZodPipe(CreateObjectSchema)) body: CreateObjectInput) {
    return this.service.create(user, orgId, body);
  }

  @Get('organizations/:orgId/objects.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="inventory.csv"')
  csv(@CurrentUser() user: User, @Param('orgId') orgId: string) {
    return this.service.exportCsv(user, orgId);
  }

  @Get('organizations/:orgId/summary')
  summary(@CurrentUser() user: User, @Param('orgId') orgId: string) {
    return this.service.summary(user, orgId);
  }

  @Get('objects/:id')
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.get(user, id);
  }

  @Patch('objects/:id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body(new ZodPipe(UpdateObjectSchema)) body: UpdateObjectInput) {
    return this.service.update(user, id, body);
  }

  @Post('objects/:id/archive')
  @HttpCode(200)
  archive(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.archive(user, id);
  }

  @Patch('objects/:id/status')
  status(@CurrentUser() user: User, @Param('id') id: string, @Body(new ZodPipe(ChangeStatusSchema)) body: ChangeStatusInput) {
    return this.service.changeStatus(user, id, body.status);
  }

  @Get('objects/:id/events')
  events(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.listEvents(user, id);
  }

  @Post('objects/:id/events')
  addEvent(@CurrentUser() user: User, @Param('id') id: string, @Body(new ZodPipe(CreateEventSchema)) body: CreateEventInput) {
    return this.service.addEvent(user, id, body);
  }
}
