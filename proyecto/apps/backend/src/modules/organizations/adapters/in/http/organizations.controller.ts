import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AddMemberSchema, CreateOrganizationSchema, UpdateOrganizationSchema, UpdateMemberRoleSchema } from '@memoratag/contracts';
import type { AddMemberInput, CreateOrganizationInput, UpdateOrganizationInput, UpdateMemberRoleInput } from '@memoratag/contracts';
import { AuthGuard, CurrentUser } from '../../../../identity/adapters/in/http/auth.guard';
import type { CurrentUser as User } from '../../../../identity/domain/current-user';
import { UuidParam, ZodPipe } from '../../../../../shared/http';
import { OrganizationsService } from '../../../application/organizations.service';

@Controller('organizations')
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.service.listMine(user);
  }

  @Post()
  create(@CurrentUser() user: User, @Body(new ZodPipe(CreateOrganizationSchema)) body: CreateOrganizationInput) {
    return this.service.create(user, body);
  }

  @Patch(':orgId')
  rename(@CurrentUser() user: User, @Param('orgId', UuidParam) orgId: string, @Body(new ZodPipe(UpdateOrganizationSchema)) body: UpdateOrganizationInput) {
    return this.service.rename(user, orgId, body);
  }

  @Get(':orgId/members')
  members(@CurrentUser() user: User, @Param('orgId', UuidParam) orgId: string) {
    return this.service.listMembers(user, orgId);
  }

  @Post(':orgId/members')
  addMember(@CurrentUser() user: User, @Param('orgId', UuidParam) orgId: string, @Body(new ZodPipe(AddMemberSchema)) body: AddMemberInput) {
    return this.service.addMember(user, orgId, body);
  }

  @Patch(':orgId/members/:userId')
  changeRole(@CurrentUser() user: User, @Param('orgId', UuidParam) orgId: string, @Param('userId', UuidParam) userId: string, @Body(new ZodPipe(UpdateMemberRoleSchema)) body: UpdateMemberRoleInput) {
    return this.service.changeRole(user, orgId, userId, body.role);
  }

  @Delete(':orgId/members/:userId')
  @HttpCode(204)
  async remove(@CurrentUser() user: User, @Param('orgId', UuidParam) orgId: string, @Param('userId', UuidParam) userId: string) {
    await this.service.removeMember(user, orgId, userId);
  }
}
