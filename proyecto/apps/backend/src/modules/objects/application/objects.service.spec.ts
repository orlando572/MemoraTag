import { MemoryObjectRepository } from '../adapters/out/memory/memory-object.repository';
import { objectsToCsv } from '../domain/csv';
import { ObjectsService } from './objects.service';

const admin = { id: 'u-admin', email: 'a@x.com' };
const member = { id: 'u-member', email: 'm@x.com' };
const outsider = { id: 'u-out', email: 'o@x.com' };
const roles: Record<string, 'admin' | 'member'> = { 'u-admin': 'admin', 'u-member': 'member' };

function setup() {
  const memberships = { getRole: async (_org: string, userId: string) => roles[userId] ?? null };
  return new ObjectsService(new MemoryObjectRepository(), memberships);
}
const input = { name: 'Laptop', description: '', color: '#fff', status: 'in_use' as const };

describe('ObjectsService', () => {
  it('lets only admins create, edit and archive', async () => {
    const s = setup();
    await expect(s.create(member, 'org', input)).rejects.toThrow('Admin');
    const obj = await s.create(admin, 'org', input);
    await expect(s.update(member, obj.id, { name: 'x' })).rejects.toThrow('Admin');
    await expect(s.archive(member, obj.id)).rejects.toThrow('Admin');
    expect((await s.archive(admin, obj.id)).archived_at).toBeTruthy();
    expect(await s.list(admin, 'org', {})).toHaveLength(0);
  });

  it('deletes only archived objects, only for admins, and hides them afterwards', async () => {
    const s = setup();
    const obj = await s.create(admin, 'org', input);
    await expect(s.remove(admin, obj.id)).rejects.toThrow('Archive');
    await s.archive(admin, obj.id);
    await expect(s.remove(member, obj.id)).rejects.toThrow('Admin');
    await expect(s.remove(outsider, obj.id)).rejects.toThrow('not found');
    await s.remove(admin, obj.id);
    await expect(s.get(admin, obj.id)).rejects.toThrow('not found');
    expect(await s.list(admin, 'org', { archived: true })).toHaveLength(0);
    await expect(s.remove(admin, obj.id)).rejects.toThrow('not found');
  });

  it('lets members change status and record events', async () => {
    const s = setup();
    const obj = await s.create(admin, 'org', input);
    expect((await s.changeStatus(member, obj.id, 'in_repair')).status).toBe('in_repair');
    const ev = await s.addEvent(member, obj.id, { type: 'issue', title: 'Broken', description: '' });
    expect(ev.created_by).toBe(member.id);
    expect(await s.listEvents(member, obj.id)).toHaveLength(1);
  });

  it('hides objects from non-members and archived objects reject changes', async () => {
    const s = setup();
    const obj = await s.create(admin, 'org', input);
    await expect(s.get(outsider, obj.id)).rejects.toThrow('not found');
    await expect(s.list(outsider, 'org', {})).rejects.toThrow('Not a member');
    await s.archive(admin, obj.id);
    await expect(s.changeStatus(admin, obj.id, 'retired')).rejects.toThrow('archived');
  });

  it('filters by text, status, location and category', async () => {
    const s = setup();
    await s.create(admin, 'org', { ...input, name: 'Drill', internal_code: 'TL-001', location: 'Warehouse A', category: 'Tools' });
    const van = await s.create(admin, 'org', { ...input, name: 'Van', internal_code: 'VH-9', location: 'Yard', category: 'Vehicles' });
    await s.changeStatus(admin, van.id, 'in_repair');
    expect(await s.list(admin, 'org', { q: 'tl-0' })).toHaveLength(1);
    expect(await s.list(admin, 'org', { q: 'yard' })).toHaveLength(1);
    expect(await s.list(admin, 'org', { status: 'in_repair' })).toHaveLength(1);
    expect(await s.list(admin, 'org', { location: 'ware' })).toHaveLength(1);
    expect(await s.list(admin, 'org', { category: 'vehicles' })).toHaveLength(1);
  });

  it('counts open incidents in the summary', async () => {
    const s = setup();
    const obj = await s.create(admin, 'org', input);
    await s.addEvent(member, obj.id, { type: 'issue', title: 'a', description: '' });
    await s.addEvent(member, obj.id, { type: 'issue', title: 'b', description: '' });
    await s.addEvent(member, obj.id, { type: 'resolved', title: 'c', description: '' });
    const sum = await s.summary(member, 'org');
    expect(sum).toMatchObject({ total: 1, open_incidents: 1, by_status: { in_use: 1, in_repair: 0, retired: 0 } });
    expect(sum.recent_events).toHaveLength(3);
  });
});

describe('ObjectsService archive, restore and authors', () => {
  it('lists archived objects only on request and restores them (admin only, idempotent)', async () => {
    const s = setup();
    const obj = await s.create(admin, 'org', input);
    await s.create(admin, 'org', { ...input, name: 'Other' });
    await s.archive(admin, obj.id);
    expect(await s.list(member, 'org', {})).toHaveLength(1);
    expect((await s.list(member, 'org', { archived: true })).map((o) => o.id)).toEqual([obj.id]);
    await expect(s.restore(member, obj.id)).rejects.toThrow('Admin');
    await expect(s.restore(outsider, obj.id)).rejects.toThrow('not found');
    expect((await s.restore(admin, obj.id)).archived_at).toBeNull();
    expect((await s.restore(admin, obj.id)).archived_at).toBeNull();
    expect(await s.list(admin, 'org', {})).toHaveLength(2);
    expect(await s.list(admin, 'org', { archived: true })).toHaveLength(0);
  });

  it('adds the author email to events and to the summary', async () => {
    const memberships = { getRole: async (_org: string, userId: string) => roles[userId] ?? null };
    const users = { remember: async () => undefined, findByEmail: async () => null, findByIds: async (ids: string[]) => [admin, member].filter((u) => ids.includes(u.id)) };
    const s = new ObjectsService(new MemoryObjectRepository(), memberships, undefined, users);
    const obj = await s.create(admin, 'org', input);
    await s.addEvent(member, obj.id, { type: 'note', title: 'n', description: '' });
    expect((await s.listEvents(admin, obj.id))[0].created_by_email).toBe('m@x.com');
    expect((await s.summary(admin, 'org')).recent_events[0].created_by_email).toBe('m@x.com');
  });
});

describe('ObjectsService NFC', () => {
  it('lets only admins mark NFC, hides objects from outsiders and blocks archived ones', async () => {
    const s = setup();
    const obj = await s.create(admin, 'org', input);
    await expect(s.markNfc(member, obj.id)).rejects.toThrow('Admin');
    await expect(s.markNfc(outsider, obj.id)).rejects.toThrow('not found');
    expect((await s.markNfc(admin, obj.id)).nfc_written_at).toBeTruthy();
    await s.archive(admin, obj.id);
    await expect(s.markNfc(admin, obj.id)).rejects.toThrow('archived');
  });

  it('filters by NFC together with other filters and archived', async () => {
    const s = setup();
    const a = await s.create(admin, 'org', { ...input, name: 'A', location: 'L1' });
    await s.create(admin, 'org', { ...input, name: 'B', location: 'L1' });
    const c = await s.create(admin, 'org', { ...input, name: 'C', location: 'L2' });
    await s.markNfc(admin, a.id);
    await s.markNfc(admin, c.id);
    const names = async (f: object) => (await s.list(admin, 'org', f)).map((o) => o.name);
    expect(await names({ nfc: 'with' })).toEqual(['A', 'C']);
    expect(await names({ nfc: 'without' })).toEqual(['B']);
    expect(await names({ nfc: 'with', location: 'L2' })).toEqual(['C']);
    await s.archive(admin, c.id);
    expect(await names({ nfc: 'with', archived: true })).toEqual(['C']);
    expect(await names({ nfc: 'with' })).toEqual(['A']);
  });
});

describe('objectsToCsv', () => {
  it('escapes quotes and neutralizes formulas', () => {
    const csv = objectsToCsv([{ id: '1', organization_id: 'o', name: '=cmd', description: 'say "hi", ok', color: '', status: 'in_use', created_at: 't' }]);
    expect(csv.split('\r\n')[1]).toContain("'=cmd");
    expect(csv).toContain('"say ""hi"", ok"');
  });
});
