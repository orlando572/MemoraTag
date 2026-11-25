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

describe('objectsToCsv', () => {
  it('escapes quotes and neutralizes formulas', () => {
    const csv = objectsToCsv([{ id: '1', organization_id: 'o', name: '=cmd', description: 'say "hi", ok', color: '', status: 'in_use', created_at: 't' }]);
    expect(csv.split('\r\n')[1]).toContain("'=cmd");
    expect(csv).toContain('"say ""hi"", ok"');
  });
});
