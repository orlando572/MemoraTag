import { MemoryObjectRepository } from '../../objects/adapters/out/memory/memory-object.repository';
import { MemoryEventFileRepository } from '../adapters/out/memory/memory-event-file.repository';
import { MemoryFileStorage } from '../adapters/out/memory/memory-file-storage';
import { matchesSignature, sanitizeName } from '../domain/file-rules';
import { FilesService } from './files.service';

const admin = { id: 'u-admin', email: 'a@x.com' };
const member = { id: 'u-member', email: 'm@x.com' };
const outsider = { id: 'u-out', email: 'o@x.com' };
const roles: Record<string, 'admin' | 'member'> = { 'u-admin': 'admin', 'u-member': 'member' };

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const pdf = Buffer.from('%PDF-1.4 test');

async function setup(failRemove = false) {
  const objects = new MemoryObjectRepository();
  const storage = new MemoryFileStorage();
  if (failRemove) storage.remove = async () => { throw new Error('boom'); };
  const logs: string[] = [];
  const service = new FilesService(new MemoryEventFileRepository(), storage, objects, { getRole: async (_o, u) => roles[u] ?? null }, (m) => logs.push(m));
  await objects.create({ id: 'obj', organization_id: 'org', name: 'x', description: '', color: '', status: 'in_use', created_at: 't' });
  await objects.addEvent({ id: 'ev', object_id: 'obj', type: 'note', title: 't', description: '', created_at: 't', created_by: 'u-admin', files: [] });
  return { service, storage, objects, logs };
}

describe('FilesService', () => {
  it('lets members upload photos and documents and stores under a generated path', async () => {
    const { service, storage } = await setup();
    const photo = await service.upload(member, 'ev', { name: '../../evil/..\\photo.jpg', mime: 'image/jpeg', bytes: jpeg });
    expect(photo).toMatchObject({ kind: 'photo', name: 'photo.jpg', size: jpeg.length, created_by: member.id });
    const doc = await service.upload(member, 'ev', { name: 'a.pdf', mime: 'application/pdf', bytes: pdf });
    expect(doc.kind).toBe('document');
    expect([...storage.blobs.keys()][0]).toBe(`org/org/object/obj/event/ev/${photo.id}`);
  });

  it('rejects wrong signatures, disallowed types, empty and oversized files', async () => {
    const { service } = await setup();
    await expect(service.upload(member, 'ev', { name: 'a.jpg', mime: 'image/jpeg', bytes: Buffer.from('plain text') })).rejects.toThrow('does not match');
    await expect(service.upload(member, 'ev', { name: 'a.txt', mime: 'text/plain', bytes: Buffer.from('x') })).rejects.toThrow('not allowed');
    await expect(service.upload(member, 'ev', { name: 'a.pdf', mime: 'application/pdf', bytes: Buffer.alloc(0) })).rejects.toThrow('empty');
    await expect(service.upload(member, 'ev', { name: 'a.pdf', mime: 'application/pdf', bytes: Buffer.concat([pdf, Buffer.alloc(5 * 1024 * 1024)]) })).rejects.toThrow('5 MB');
  });

  it('hides events and files from non-members and blocks archived objects', async () => {
    const { service, objects } = await setup();
    await expect(service.upload(outsider, 'ev', { name: 'a.jpg', mime: 'image/jpeg', bytes: jpeg })).rejects.toThrow('not found');
    const f = await service.upload(member, 'ev', { name: 'a.jpg', mime: 'image/jpeg', bytes: jpeg });
    await expect(service.signedUrl(outsider, f.id)).rejects.toThrow('not found');
    expect((await service.signedUrl(member, f.id)).expires_in).toBe(300);
    await objects.archive('obj', 'now');
    await expect(service.upload(member, 'ev', { name: 'a.jpg', mime: 'image/jpeg', bytes: jpeg })).rejects.toThrow('archived');
  });

  it('only admins delete, and storage failures do not break the request', async () => {
    const { service, logs } = await setup(true);
    const f = await service.upload(member, 'ev', { name: 'a.jpg', mime: 'image/jpeg', bytes: jpeg });
    await expect(service.remove(member, f.id)).rejects.toThrow('Admin');
    await expect(service.remove(outsider, f.id)).rejects.toThrow('not found');
    await service.remove(admin, f.id);
    expect(logs[0]).toContain('boom');
    await expect(service.signedUrl(admin, f.id)).rejects.toThrow('not found');
  });
});

describe('file rules', () => {
  it('checks magic bytes', () => {
    expect(matchesSignature('image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0]))).toBe(true);
    expect(matchesSignature('image/webp', Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe(true);
    expect(matchesSignature('image/webp', Buffer.from('RIFF\0\0\0\0WAVE'))).toBe(false);
    expect(matchesSignature('application/vnd.ms-excel', Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))).toBe(true);
    expect(matchesSignature('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', Buffer.from('PK\x03\x04'))).toBe(true);
  });
  it('sanitizes names', () => {
    expect(sanitizeName('a/b\\c\u0000.pdf')).toBe('c.pdf');
    expect(sanitizeName('x'.repeat(300))).toHaveLength(200);
    expect(sanitizeName('/')).toBe('file');
  });
});
