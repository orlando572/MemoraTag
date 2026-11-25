import type { Role } from '@memoratag/contracts';
import type { Membership, Organization } from '../domain/organization';

export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY');

export interface OrganizationRepository {
  /** Creates the organization and registers `adminUserId` as its first admin. */
  create(org: Organization, adminUserId: string): Promise<void>;
  listForUser(userId: string): Promise<(Organization & { role: Role })[]>;
  getRole(orgId: string, userId: string): Promise<Role | null>;
  listMembers(orgId: string): Promise<Membership[]>;
  addMember(orgId: string, userId: string, role: Role): Promise<void>;
  setRole(orgId: string, userId: string, role: Role): Promise<void>;
  removeMember(orgId: string, userId: string): Promise<void>;
}
