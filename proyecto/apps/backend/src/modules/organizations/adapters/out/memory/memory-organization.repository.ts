import type { Role } from '@memoratag/contracts';
import type { Membership, Organization } from '../../../domain/organization';
import type { OrganizationRepository } from '../../../application/ports';

export class MemoryOrganizationRepository implements OrganizationRepository {
  private readonly orgs = new Map<string, Organization>();
  private readonly members = new Map<string, Membership[]>();

  async create(org: Organization, adminUserId: string) {
    this.orgs.set(org.id, org);
    this.members.set(org.id, [{ user_id: adminUserId, role: 'admin' }]);
  }
  async rename(orgId: string, name: string) {
    const org = { ...this.orgs.get(orgId)!, name };
    this.orgs.set(orgId, org);
    return org;
  }
  async listForUser(userId: string) {
    return [...this.orgs.values()].flatMap((o) => {
      const m = this.members.get(o.id)?.find((x) => x.user_id === userId);
      return m ? [{ ...o, role: m.role }] : [];
    });
  }
  async getRole(orgId: string, userId: string) {
    return this.members.get(orgId)?.find((m) => m.user_id === userId)?.role ?? null;
  }
  async listMembers(orgId: string) {
    return [...(this.members.get(orgId) ?? [])];
  }
  async addMember(orgId: string, userId: string, role: Role) {
    this.members.get(orgId)?.push({ user_id: userId, role });
  }
  async setRole(orgId: string, userId: string, role: Role) {
    const m = this.members.get(orgId)?.find((x) => x.user_id === userId);
    if (m) m.role = role;
  }
  async removeMember(orgId: string, userId: string) {
    this.members.set(orgId, (this.members.get(orgId) ?? []).filter((m) => m.user_id !== userId));
  }
}
