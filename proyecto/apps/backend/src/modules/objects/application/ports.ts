import type { InventoryObject, InventoryStatus, ObjectEvent, ObjectFilters, OrganizationSummary, Role } from '@memoratag/contracts';

export const OBJECT_REPOSITORY = Symbol('OBJECT_REPOSITORY');
export const MEMBERSHIP_READER = Symbol('MEMBERSHIP_READER');

/** Narrow view of organization membership needed to authorize object operations. */
export interface MembershipReader {
  getRole(orgId: string, userId: string): Promise<Role | null>;
}

export type ObjectPatch = Partial<Pick<InventoryObject, 'name' | 'description' | 'color' | 'internal_code' | 'category' | 'location' | 'assignee'>>;

export interface ObjectRepository {
  create(obj: InventoryObject): Promise<void>;
  /** Returns the object even when archived. */
  getById(id: string): Promise<InventoryObject | null>;
  /** Non-archived objects of the organization matching the filters. */
  list(orgId: string, filters: ObjectFilters): Promise<InventoryObject[]>;
  update(id: string, patch: ObjectPatch): Promise<InventoryObject>;
  setStatus(id: string, status: InventoryStatus): Promise<InventoryObject>;
  archive(id: string, at: string): Promise<InventoryObject>;
  listEvents(objectId: string): Promise<ObjectEvent[]>;
  addEvent(event: ObjectEvent): Promise<void>;
  summary(orgId: string): Promise<OrganizationSummary>;
}
