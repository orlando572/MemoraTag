import { MemoryUserDirectory } from '../../identity/adapters/out/memory/memory-user-directory';
import { MemoryOrganizationRepository } from '../adapters/out/memory/memory-organization.repository';
import { OrganizationsService } from './organizations.service';

const ana = { id: 'u-ana', email: 'ana@x.com' };
const bob = { id: 'u-bob', email: 'bob@x.com' };
const eve = { id: 'u-eve', email: 'eve@x.com' };

async function setup() {
  const users = new MemoryUserDirectory();
  for (const u of [ana, bob, eve]) await users.remember(u);
  const service = new OrganizationsService(new MemoryOrganizationRepository(), users);
  const org = await service.create(ana, { name: 'Acme' });
  return { service, org };
}

describe('OrganizationsService', () => {
  it('makes the creator an admin and lists the organization', async () => {
    const { service, org } = await setup();
    expect(org.role).toBe('admin');
    expect(await service.listMine(ana)).toHaveLength(1);
    expect(await service.listMine(bob)).toHaveLength(0);
  });

  it('adds members by email and lists them with emails', async () => {
    const { service, org } = await setup();
    await service.addMember(ana, org.id, { email: 'bob@x.com', role: 'member' });
    const members = await service.listMembers(bob, org.id);
    expect(members.map((m) => m.email).sort()).toEqual(['ana@x.com', 'bob@x.com']);
  });

  it('rejects unknown emails and duplicates', async () => {
    const { service, org } = await setup();
    await expect(service.addMember(ana, org.id, { email: 'nobody@x.com', role: 'member' })).rejects.toThrow('No registered user');
    await service.addMember(ana, org.id, { email: 'bob@x.com', role: 'member' });
    await expect(service.addMember(ana, org.id, { email: 'bob@x.com', role: 'member' })).rejects.toThrow('already');
  });

  it('only admins manage members', async () => {
    const { service, org } = await setup();
    await service.addMember(ana, org.id, { email: 'bob@x.com', role: 'member' });
    await expect(service.addMember(bob, org.id, { email: 'eve@x.com', role: 'member' })).rejects.toThrow('Admin');
    await expect(service.removeMember(bob, org.id, ana.id)).rejects.toThrow('Admin');
    await expect(service.listMembers(eve, org.id)).rejects.toThrow('Not a member');
  });

  it('protects the last admin from removal and demotion', async () => {
    const { service, org } = await setup();
    await expect(service.removeMember(ana, org.id, ana.id)).rejects.toThrow('last admin');
    await expect(service.changeRole(ana, org.id, ana.id, 'member')).rejects.toThrow('last admin');
    await service.addMember(ana, org.id, { email: 'bob@x.com', role: 'admin' });
    await service.changeRole(ana, org.id, ana.id, 'member');
    await expect(service.removeMember(bob, org.id, bob.id)).rejects.toThrow('last admin');
  });
});
