import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TOKEN_VERIFIER, USER_DIRECTORY, UserDirectory } from '../src/modules/identity/application/ports';

const fakeVerifier = {
  async verify(token: string) {
    const [id, email] = token.split(':');
    if (!id || !email) throw new Error('bad token');
    return { id, email };
  },
};
const ID = { admin: '00000000-0000-4000-8000-000000000001', member: '00000000-0000-4000-8000-000000000002', outsider: '00000000-0000-4000-8000-000000000003' } as const;
type Name = keyof typeof ID;
const as = (name: Name) => `Bearer ${ID[name]}:${name}@x.com`;
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const pdf = Buffer.from('%PDF-1.4 hello');

describe('Event attachments (memory adapters)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let objectId: string;
  let eventId: string;

  const upload = (name: Name, id: string, data: Buffer, filename: string, mime: string) =>
    http.post(`/events/${id}/files`).set('Authorization', as(name)).attach('file', data, { filename, contentType: mime });

  beforeAll(async () => {
    process.env.PERSISTENCE = 'memory';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(TOKEN_VERIFIER).useValue(fakeVerifier).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    http = request(app.getHttpServer());
    const users = app.get<UserDirectory>(USER_DIRECTORY);
    for (const name of Object.keys(ID) as Name[]) await users.remember({ id: ID[name], email: `${name}@x.com` });
    const orgId = (await http.post('/organizations').set('Authorization', as('admin')).send({ name: 'Acme' }).expect(201)).body.id;
    await http.post(`/organizations/${orgId}/members`).set('Authorization', as('admin')).send({ email: 'member@x.com' }).expect(201);
    objectId = (await http.post(`/organizations/${orgId}/objects`).set('Authorization', as('admin')).send({ name: 'Drill' }).expect(201)).body.id;
    eventId = (await http.post(`/objects/${objectId}/events`).set('Authorization', as('member')).send({ title: 'Check' }).expect(201)).body.id;
  });
  afterAll(() => app.close());

  it('lets a member upload a photo and a document, and lists them with the event', async () => {
    const photo = (await upload('member', eventId, jpeg, 'p.jpg', 'image/jpeg').expect(201)).body;
    expect(photo).toMatchObject({ kind: 'photo', name: 'p.jpg', mime: 'image/jpeg', size: jpeg.length, event_id: eventId, created_by: ID.member });
    expect(photo.storage_path).toBeUndefined();
    await upload('admin', eventId, pdf, 'a.pdf', 'application/pdf').expect(201);
    const events = (await http.get(`/objects/${objectId}/events`).set('Authorization', as('member')).expect(200)).body;
    expect(events[0].files.map((f: { kind: string }) => f.kind)).toEqual(['photo', 'document']);
  });

  it('validates the file', async () => {
    await http.post(`/events/${eventId}/files`).set('Authorization', as('member')).expect(400);
    await upload('member', eventId, Buffer.from('just text'), 'x.jpg', 'image/jpeg').expect(400);
    await upload('member', eventId, Buffer.from('just text'), 'x.txt', 'text/plain').expect(400);
    const big = Buffer.concat([pdf, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await upload('member', eventId, big, 'big.pdf', 'application/pdf');
    expect([400, 413]).toContain(res.status);
    await http.post('/events/not-a-uuid/files').set('Authorization', as('member')).expect(404);
  });

  it('hides events and files from outsiders', async () => {
    await upload('outsider', eventId, jpeg, 'p.jpg', 'image/jpeg').expect(404);
    const file = (await http.get(`/objects/${objectId}/events`).set('Authorization', as('member'))).body[0].files[0];
    await http.get(`/files/${file.id}/url`).set('Authorization', as('outsider')).expect(404);
    await http.delete(`/files/${file.id}`).set('Authorization', as('outsider')).expect(404);
  });

  it('returns a signed url to members', async () => {
    const file = (await http.get(`/objects/${objectId}/events`).set('Authorization', as('member'))).body[0].files[0];
    const body = (await http.get(`/files/${file.id}/url`).set('Authorization', as('member')).expect(200)).body;
    expect(body.expires_in).toBe(300);
    expect(typeof body.url).toBe('string');
  });

  it('lets only admins delete, then hides the file', async () => {
    const file = (await http.get(`/objects/${objectId}/events`).set('Authorization', as('member'))).body[0].files[0];
    await http.delete(`/files/${file.id}`).set('Authorization', as('member')).expect(403);
    await http.delete(`/files/${file.id}`).set('Authorization', as('admin')).expect(204);
    await http.get(`/files/${file.id}/url`).set('Authorization', as('admin')).expect(404);
    const events = (await http.get(`/objects/${objectId}/events`).set('Authorization', as('member'))).body;
    expect(events[0].files).toHaveLength(1);
  });

  it('lets an admin set the object photo, members read it, and exposes only the date', async () => {
    const photo = (name: Name, data: Buffer, mime: string) =>
      http.post(`/objects/${objectId}/photo`).set('Authorization', as(name)).attach('file', data, { filename: 'p', contentType: mime });
    await photo('member', jpeg, 'image/jpeg').expect(403);
    await photo('admin', pdf, 'application/pdf').expect(400);
    const updated = (await photo('admin', jpeg, 'image/jpeg').expect(201)).body;
    expect(updated.photo_updated_at).toBeTruthy();
    expect(updated.photo_path).toBeUndefined();
    expect((await http.get(`/objects/${objectId}`).set('Authorization', as('member')).expect(200)).body.photo_updated_at).toBe(updated.photo_updated_at);
    expect((await http.get(`/objects/${objectId}/photo/url`).set('Authorization', as('member')).expect(200)).body.expires_in).toBe(300);
    await http.get(`/objects/${objectId}/photo/url`).set('Authorization', as('outsider')).expect(404);
    expect((await http.delete(`/objects/${objectId}/photo`).set('Authorization', as('admin')).expect(200)).body.photo_updated_at).toBeNull();
    await http.get(`/objects/${objectId}/photo/url`).set('Authorization', as('member')).expect(404);
  });

  it('rejects uploads on archived objects', async () => {
    await http.post(`/objects/${objectId}/archive`).set('Authorization', as('admin')).expect(200);
    await upload('member', eventId, jpeg, 'p.jpg', 'image/jpeg').expect(409);
  });
});
