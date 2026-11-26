import { randomUUID } from 'node:crypto';
import type { AddMemberInput, CreateOrganizationInput, Member, Role, UpdateOrganizationInput } from '@memoratag/contracts';
import type { UserDirectory } from '../../identity/application/ports';
import type { CurrentUser } from '../../identity/domain/current-user';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import type { OrganizationRepository } from './ports';

/** Use cases for organizations and their members. */
export class OrganizationsService {
  constructor(
    private readonly repo: OrganizationRepository,
    private readonly users: UserDirectory,
  ) {}

  async create(user: CurrentUser, input: CreateOrganizationInput) {
    const org = { id: randomUUID(), name: input.name, created_at: new Date().toISOString() };
    await this.repo.create(org, user.id);
    return { ...org, role: 'admin' as Role };
  }

  async rename(user: CurrentUser, orgId: string, input: UpdateOrganizationInput) {
    await this.requireAdmin(user, orgId);
    return { ...(await this.repo.rename(orgId, input.name)), role: 'admin' as Role };
  }

  listMine(user: CurrentUser) {
    return this.repo.listForUser(user.id);
  }

  async listMembers(user: CurrentUser, orgId: string): Promise<Member[]> {
    await this.requireMember(user, orgId);
    const members = await this.repo.listMembers(orgId);
    const emails = new Map((await this.users.findByIds(members.map((m) => m.user_id))).map((u) => [u.id, u.email]));
    return members.map((m) => ({ user_id: m.user_id, role: m.role, email: emails.get(m.user_id) ?? '' }));
  }

  async addMember(user: CurrentUser, orgId: string, input: AddMemberInput): Promise<Member> {
    await this.requireAdmin(user, orgId);
    const target = await this.users.findByEmail(input.email);
    if (!target) throw new NotFoundError('No registered user with that email');
    if (await this.repo.getRole(orgId, target.id)) throw new ConflictError('User is already a member');
    await this.repo.addMember(orgId, target.id, input.role);
    return { user_id: target.id, email: target.email, role: input.role };
  }

  async changeRole(user: CurrentUser, orgId: string, userId: string, role: Role) {
    await this.requireAdmin(user, orgId);
    const current = await this.repo.getRole(orgId, userId);
    if (!current) throw new NotFoundError('Member not found');
    if (current === 'admin' && role !== 'admin') await this.assertNotLastAdmin(orgId);
    await this.repo.setRole(orgId, userId, role);
    return { user_id: userId, role };
  }

  async removeMember(user: CurrentUser, orgId: string, userId: string) {
    await this.requireAdmin(user, orgId);
    const current = await this.repo.getRole(orgId, userId);
    if (!current) throw new NotFoundError('Member not found');
    if (current === 'admin') await this.assertNotLastAdmin(orgId);
    await this.repo.removeMember(orgId, userId);
  }

  private async assertNotLastAdmin(orgId: string) {
    const admins = (await this.repo.listMembers(orgId)).filter((m) => m.role === 'admin');
    if (admins.length <= 1) throw new ConflictError('The last admin cannot be removed or demoted');
  }

  private async requireMember(user: CurrentUser, orgId: string) {
    const role = await this.repo.getRole(orgId, user.id);
    if (!role) throw new ForbiddenError('Not a member of this organization');
    return role;
  }

  private async requireAdmin(user: CurrentUser, orgId: string) {
    if ((await this.requireMember(user, orgId)) !== 'admin') throw new ForbiddenError('Admin role required');
  }
}
