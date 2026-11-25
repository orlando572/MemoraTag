import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TOKEN_VERIFIER, USER_DIRECTORY, UserDirectory } from '../src/modules/identity/application/ports';

// Fake verifier: the token is "id:email".
const fakeVerifier = {
  async verify(token: string) {
    const [id, email] = token.split(':');
    if (!id || !email) throw new Error('bad token');
    return { id, email };
  },
};
// Supabase user ids are UUIDs, and the API only accepts UUIDs in route ids.
const ID = { admin: '00000000-0000-4000-8000-000000000001', member: '00000000-0000-4000-8000-000000000002', outsider: '00000000-0000-4000-8000-000000000003' } as const;
type Name = keyof typeof ID;
const as = (name: Name) => `Bearer ${ID[name]}:${name}@x.com`;

describe('HTTP API (memory adapters)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let orgId: string;
  let objectId: string;

  beforeAll(async () => {
    process.env.PERSISTENCE = 'memory';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(TOKEN_VERIFIER).useValue(fakeVerifier).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    http = request(app.getHttpServer());
    const users = app.get<UserDirectory>(USER_DIRECTORY);
    for (const name of Object.keys(ID) as Name[]) await users.remember({ id: ID[name], email: `${name}@x.com` });
    orgId = (await http.post('/organizations').set('Authorization', as('admin')).send({ name: 'Acme' }).expect(201)).body.id;
    await http.post(`/organizations/${orgId}/members`).set('Authorization', as('admin')).send({ email: 'member@x.com' }).expect(201);
    objectId = (await http.post(`/organizations/${orgId}/objects`).set('Authorization', as('admin')).send({ name: 'Drill', internal_code: 'TL-1', location: 'Shop', category: 'Tools' }).expect(201)).body.id;
  });
  afterAll(() => app.close());

  it('rejects missing or invalid tokens', async () => {
    await http.get('/organizations').expect(401);
    await http.get('/organizations').set('Authorization', 'Bearer garbage').expect(401);
  });

  it('validates input with the shared schemas', async () => {
    await http.post('/organizations').set('Authorization', as('admin')).send({ name: '' }).expect(400);
    await http.post(`/organizations/${orgId}/objects`).set('Authorization', as('admin')).send({ name: 'x', status: 'bogus' }).expect(400);
  });

  it('lists organizations and members', async () => {
    expect((await http.get('/organizations').set('Authorization', as('member')).expect(200)).body).toHaveLength(1);
    const members = (await http.get(`/organizations/${orgId}/members`).set('Authorization', as('member')).expect(200)).body;
    expect(members).toEqual(expect.arrayContaining([{ user_id: ID.member, email: 'member@x.com', role: 'member' }]));
  });

  it('forbids members from managing members or objects', async () => {
    const m = as('member');
    await http.post(`/organizations/${orgId}/members`).set('Authorization', m).send({ email: 'outsider@x.com' }).expect(403);
    await http.patch(`/organizations/${orgId}/members/${ID.admin}`).set('Authorization', m).send({ role: 'member' }).expect(403);
    await http.delete(`/organizations/${orgId}/members/${ID.admin}`).set('Authorization', m).expect(403);
    await http.post(`/organizations/${orgId}/objects`).set('Authorization', m).send({ name: 'Nope' }).expect(403);
    await http.patch(`/objects/${objectId}`).set('Authorization', m).send({ name: 'Nope' }).expect(403);
    await http.post(`/objects/${objectId}/archive`).set('Authorization', m).expect(403);
  });

  it('lets members change status and record events', async () => {
    const m = as('member');
    const patched = await http.patch(`/objects/${objectId}/status`).set('Authorization', m).send({ status: 'in_repair' }).expect(200);
    expect(patched.body.status).toBe('in_repair');
    await http.post(`/objects/${objectId}/events`).set('Authorization', m).send({ type: 'issue', title: 'Chuck broken' }).expect(201);
    const events = (await http.get(`/objects/${objectId}/events`).set('Authorization', m).expect(200)).body;
    expect(events).toMatchObject([{ type: 'issue', title: 'Chuck broken', created_by: ID.member }]);
    const summary = (await http.get(`/organizations/${orgId}/summary`).set('Authorization', m).expect(200)).body;
    expect(summary).toMatchObject({ total: 1, open_incidents: 1, by_status: { in_repair: 1 } });
  });

  it('denies outsiders with 403/404', async () => {
    const o = as('outsider');
    await http.get('/objects/not-a-uuid').set('Authorization', o).expect(404);
    await http.get(`/organizations/${orgId}/objects`).set('Authorization', o).expect(403);
    await http.get(`/organizations/${orgId}/members`).set('Authorization', o).expect(403);
    await http.get(`/organizations/${orgId}/summary`).set('Authorization', o).expect(403);
    await http.get(`/organizations/${orgId}/objects.csv`).set('Authorization', o).expect(403);
    await http.get(`/objects/${objectId}`).set('Authorization', o).expect(404);
    await http.patch(`/objects/${objectId}/status`).set('Authorization', o).send({ status: 'retired' }).expect(404);
    await http.post(`/objects/${objectId}/events`).set('Authorization', o).send({ title: 'x' }).expect(404);
  });

  it('filters and searches objects', async () => {
    const a = as('admin');
    await http.post(`/organizations/${orgId}/objects`).set('Authorization', a).send({ name: 'Van', internal_code: 'VH-9', location: 'Yard', category: 'Vehicles' }).expect(201);
    const names = async (qs: string) => (await http.get(`/organizations/${orgId}/objects?${qs}`).set('Authorization', a).expect(200)).body.map((o: { name: string }) => o.name);
    expect(await names('')).toHaveLength(2);
    expect(await names('q=vh-9')).toEqual(['Van']);
    expect(await names('q=shop')).toEqual(['Drill']);
    expect(await names('status=in_repair')).toEqual(['Drill']);
    expect(await names('location=yard')).toEqual(['Van']);
    expect(await names('category=Tools')).toEqual(['Drill']);
    await http.get(`/organizations/${orgId}/objects?status=bogus`).set('Authorization', a).expect(400);
  });

  it('exports CSV', async () => {
    const res = await http.get(`/organizations/${orgId}/objects.csv`).set('Authorization', as('member')).expect(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const lines = res.text.trim().split('\r\n');
    expect(lines[0]).toBe('id,name,internal_code,category,location,assignee,status,description,created_at,nfc');
    expect(lines).toHaveLength(3);
    expect(res.text).toContain('Drill,TL-1,Tools,Shop');
  });

  it('protects the last admin', async () => {
    const a = as('admin');
    await http.patch(`/organizations/${orgId}/members/${ID.admin}`).set('Authorization', a).send({ role: 'member' }).expect(409);
    await http.delete(`/organizations/${orgId}/members/${ID.admin}`).set('Authorization', a).expect(409);
    await http.patch(`/organizations/${orgId}/members/${ID.member}`).set('Authorization', a).send({ role: 'admin' }).expect(200);
    await http.delete(`/organizations/${orgId}/members/${ID.admin}`).set('Authorization', a).expect(204);
    await http.get(`/organizations/${orgId}/objects`).set('Authorization', a).expect(403);
  });

  it('archives objects (admin only) and hides them from lists', async () => {
    const m = as('member'); // now an admin
    await http.post(`/objects/${objectId}/archive`).set('Authorization', m).expect(200);
    expect((await http.get(`/organizations/${orgId}/objects`).set('Authorization', m).expect(200)).body).toHaveLength(1);
    expect((await http.get(`/objects/${objectId}`).set('Authorization', m).expect(200)).body.archived_at).toBeTruthy();
    await http.patch(`/objects/${objectId}/status`).set('Authorization', m).send({ status: 'retired' }).expect(409);
  });
});
