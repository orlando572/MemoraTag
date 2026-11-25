import { randomUUID } from 'node:crypto';
import type { CreateEventInput, CreateObjectInput, InventoryObject, InventoryStatus, ObjectFilters, Role, UpdateObjectInput } from '@memoratag/contracts';
import type { CurrentUser } from '../../identity/domain/current-user';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../shared/errors';
import { objectsToCsv } from '../domain/csv';
import type { EventFileReader, MembershipReader, ObjectRepository } from './ports';

/**
 * Use cases for inventory objects and their events.
 * Admins manage objects; members can also change status and record events.
 */
export class ObjectsService {
  constructor(
    private readonly repo: ObjectRepository,
    private readonly memberships: MembershipReader,
    private readonly eventFiles?: EventFileReader,
  ) {}

  async create(user: CurrentUser, orgId: string, input: CreateObjectInput) {
    await this.requireRole(user, orgId, 'admin');
    const obj: InventoryObject = { ...input, id: randomUUID(), organization_id: orgId, created_at: new Date().toISOString(), archived_at: null };
    await this.repo.create(obj);
    return obj;
  }

  async list(user: CurrentUser, orgId: string, filters: ObjectFilters) {
    await this.requireRole(user, orgId);
    return this.repo.list(orgId, filters);
  }

  async exportCsv(user: CurrentUser, orgId: string) {
    return objectsToCsv(await this.list(user, orgId, {}));
  }

  async summary(user: CurrentUser, orgId: string) {
    await this.requireRole(user, orgId);
    return this.repo.summary(orgId);
  }

  async get(user: CurrentUser, id: string) {
    return (await this.load(user, id)).obj;
  }

  async update(user: CurrentUser, id: string, patch: UpdateObjectInput) {
    const { obj } = await this.load(user, id, 'admin');
    this.assertActive(obj);
    return this.repo.update(id, patch);
  }

  async archive(user: CurrentUser, id: string) {
    const { obj } = await this.load(user, id, 'admin');
    if (obj.archived_at) return obj;
    return this.repo.archive(id, new Date().toISOString());
  }

  async changeStatus(user: CurrentUser, id: string, status: InventoryStatus) {
    const { obj } = await this.load(user, id);
    this.assertActive(obj);
    return this.repo.setStatus(id, status);
  }

  async listEvents(user: CurrentUser, id: string) {
    await this.load(user, id);
    const events = await this.repo.listEvents(id);
    const files = (await this.eventFiles?.listByEvents(events.map((e) => e.id))) ?? [];
    return events.map((e) => ({ ...e, files: files.filter((f) => f.event_id === e.id) }));
  }

  async addEvent(user: CurrentUser, id: string, input: CreateEventInput) {
    const { obj } = await this.load(user, id);
    this.assertActive(obj);
    const event = { ...input, event_date: input.event_date ?? null, id: randomUUID(), object_id: id, created_at: new Date().toISOString(), created_by: user.id, files: [] };
    await this.repo.addEvent(event);
    return event;
  }

  private assertActive(obj: InventoryObject) {
    if (obj.archived_at) throw new ConflictError('Object is archived');
  }

  /** Loads an object for a user; non-members get 404 so existence is not leaked. */
  private async load(user: CurrentUser, id: string, required?: Role) {
    const obj = await this.repo.getById(id);
    const role = obj?.organization_id ? await this.memberships.getRole(obj.organization_id, user.id) : null;
    if (!obj || !role) throw new NotFoundError('Object not found');
    if (required && role !== required) throw new ForbiddenError('Admin role required');
    return { obj, role };
  }

  private async requireRole(user: CurrentUser, orgId: string, required?: Role) {
    const role = await this.memberships.getRole(orgId, user.id);
    if (!role) throw new ForbiddenError('Not a member of this organization');
    if (required && role !== required) throw new ForbiddenError('Admin role required');
  }
}
