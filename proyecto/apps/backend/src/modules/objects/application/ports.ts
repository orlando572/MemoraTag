import type { EventFile, InventoryObject, InventoryStatus, ObjectEvent, ObjectFilters, OrganizationSummary, Role } from '@memoratag/contracts';

export const OBJECT_REPOSITORY = Symbol('OBJECT_REPOSITORY');
export const EVENT_FILE_READER = Symbol('EVENT_FILE_READER');
export const MEMBERSHIP_READER = Symbol('MEMBERSHIP_READER');

/** Narrow view of organization membership needed to authorize object operations. */
export interface MembershipReader {
  getRole(orgId: string, userId: string): Promise<Role | null>;
}

/** Attachments of events, provided by the files module. */
export interface EventFileReader {
  listByEvents(eventIds: string[]): Promise<EventFile[]>;
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
  getEventById(id: string): Promise<ObjectEvent | null>;
  addEvent(event: ObjectEvent): Promise<void>;
  summary(orgId: string): Promise<OrganizationSummary>;
}
