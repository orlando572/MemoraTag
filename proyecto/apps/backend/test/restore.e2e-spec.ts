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

describe('Archived list, restore and event authors', () => {
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
    objectId = (await http.post(`/organizations/${orgId}/objects`).set('Authorization', as('admin')).send({ name: 'Drill' }).expect(201)).body.id;
  });
  afterAll(() => app.close());

  it('includes created_by_email in events and the summary', async () => {
    await http.post(`/objects/${objectId}/events`).set('Authorization', as('member')).send({ title: 'Hello' }).expect(201);
    const events = (await http.get(`/objects/${objectId}/events`).set('Authorization', as('admin')).expect(200)).body;
    expect(events[0].created_by_email).toBe('member@x.com');
    const summary = (await http.get(`/organizations/${orgId}/summary`).set('Authorization', as('admin')).expect(200)).body;
    expect(summary.recent_events[0].created_by_email).toBe('member@x.com');
  });

  it('lists archived objects with ?archived=true and restores them', async () => {
    const list = (qs: string, who: Name = 'member') => http.get(`/organizations/${orgId}/objects${qs}`).set('Authorization', as(who));
    await http.post(`/objects/${objectId}/archive`).set('Authorization', as('admin')).expect(200);
    expect((await list('').expect(200)).body).toHaveLength(0);
    expect((await list('?archived=true').expect(200)).body.map((o: { id: string }) => o.id)).toEqual([objectId]);
    expect((await list('?archived=1').expect(200)).body).toHaveLength(1);
    await list('?archived=true', 'outsider').expect(403);

    await http.post(`/objects/${objectId}/restore`).set('Authorization', as('member')).expect(403);
    await http.post(`/objects/${objectId}/restore`).set('Authorization', as('outsider')).expect(404);
    await http.post('/objects/00000000-0000-4000-8000-0000000000ff/restore').set('Authorization', as('admin')).expect(404);
    const restored = (await http.post(`/objects/${objectId}/restore`).set('Authorization', as('admin')).expect(200)).body;
    expect(restored.archived_at).toBeNull();
    await http.post(`/objects/${objectId}/restore`).set('Authorization', as('admin')).expect(200);
    expect((await list('').expect(200)).body).toHaveLength(1);
    expect((await list('?archived=true').expect(200)).body).toHaveLength(0);
  });
});
