import type { InventoryObject, InventoryStatus, ObjectEvent, ObjectFilters, OrganizationSummary } from '@memoratag/contracts';
import type { ObjectPatch, ObjectRepository } from '../../../application/ports';

const has = (value: string | null | undefined, needle: string) => (value ?? '').toLowerCase().includes(needle.toLowerCase());

export class MemoryObjectRepository implements ObjectRepository {
  private readonly objects = new Map<string, InventoryObject>();
  private events: ObjectEvent[] = [];

  async create(obj: InventoryObject) {
    this.objects.set(obj.id, { ...obj });
  }
  async getById(id: string) {
    const o = this.objects.get(id);
    return o ? { ...o } : null;
  }
  async list(orgId: string, f: ObjectFilters) {
    return [...this.objects.values()]
      .filter((o) => o.organization_id === orgId && !!o.archived_at === !!f.archived)
      .filter((o) => !f.nfc || !!o.nfc_written_at === (f.nfc === 'with'))
      .filter((o) => !f.status || o.status === f.status)
      .filter((o) => !f.location || has(o.location, f.location))
      .filter((o) => !f.category || (o.category ?? '').toLowerCase() === f.category.toLowerCase())
      .filter((o) => !f.q || has(o.name, f.q) || has(o.internal_code, f.q) || has(o.location, f.q))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((o) => ({ ...o }));
  }
  async update(id: string, patch: ObjectPatch) {
    return this.mutate(id, patch);
  }
  async markNfc(id: string, at: string, _userId: string) {
    return this.mutate(id, { nfc_written_at: at });
  }
  async setStatus(id: string, status: InventoryStatus) {
    return this.mutate(id, { status });
  }
  async archive(id: string, at: string | null) {
    return this.mutate(id, { archived_at: at });
  }
  async listEvents(objectId: string) {
    return this.events.filter((e) => e.object_id === objectId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async getEventById(id: string) {
    return this.events.find((e) => e.id === id) ?? null;
  }
  async addEvent(event: ObjectEvent) {
    this.events.push({ ...event });
  }
  async summary(orgId: string): Promise<OrganizationSummary> {
    const active = [...this.objects.values()].filter((o) => o.organization_id === orgId && !o.archived_at);
    const ids = new Set(active.map((o) => o.id));
    const by_status: Record<InventoryStatus, number> = { in_use: 0, in_repair: 0, retired: 0 };
    for (const o of active) by_status[o.status]++;
    let open_incidents = 0;
    for (const id of ids) {
      const evs = this.events.filter((e) => e.object_id === id);
      open_incidents += Math.max(0, evs.filter((e) => e.type === 'issue').length - evs.filter((e) => e.type === 'resolved').length);
    }
    const recent_events = this.events.filter((e) => ids.has(e.object_id)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10);
    return { total: active.length, by_status, open_incidents, recent_events };
  }

  private mutate(id: string, patch: Partial<InventoryObject>) {
    const next = { ...this.objects.get(id)!, ...patch };
    this.objects.set(id, next);
    return { ...next };
  }
}
