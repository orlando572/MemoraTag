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

describe('NFC marking and organization rename', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let orgId: string;
  let tagged: string;
  let plain: string;

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
    const create = async (name: string) => (await http.post(`/organizations/${orgId}/objects`).set('Authorization', as('admin')).send({ name, location: 'Shop' }).expect(201)).body.id;
    tagged = await create('Tagged');
    plain = await create('Plain');
  });
  afterAll(() => app.close());

  it('marks NFC (admin only) and exposes nfc_written_at', async () => {
    await http.post(`/objects/${tagged}/nfc`).set('Authorization', as('member')).expect(403);
    await http.post(`/objects/${tagged}/nfc`).set('Authorization', as('outsider')).expect(404);
    await http.post('/objects/00000000-0000-4000-8000-0000000000ff/nfc').set('Authorization', as('admin')).expect(404);
    const body = (await http.post(`/objects/${tagged}/nfc`).set('Authorization', as('admin')).expect(200)).body;
    expect(body.nfc_written_at).toBeTruthy();
    expect((await http.get(`/objects/${plain}`).set('Authorization', as('member')).expect(200)).body.nfc_written_at ?? null).toBeNull();
  });

  it('filters by nfc, combined with other filters and archived', async () => {
    const names = async (qs: string) => (await http.get(`/organizations/${orgId}/objects?${qs}`).set('Authorization', as('member')).expect(200)).body.map((o: { name: string }) => o.name);
    expect(await names('nfc=with')).toEqual(['Tagged']);
    expect(await names('nfc=without')).toEqual(['Plain']);
    expect(await names('nfc=with&location=shop')).toEqual(['Tagged']);
    expect(await names('nfc=without&q=tagged')).toEqual([]);
    await http.get(`/organizations/${orgId}/objects?nfc=bogus`).set('Authorization', as('member')).expect(400);
    const csv = (await http.get(`/organizations/${orgId}/objects.csv`).set('Authorization', as('member')).expect(200)).text;
    expect(csv).toContain(',nfc\r\n');
    expect(csv).toMatch(/Tagged.*,sí\r\n/);
  });

  it('rejects NFC on archived objects', async () => {
    await http.post(`/objects/${tagged}/archive`).set('Authorization', as('admin')).expect(200);
    await http.post(`/objects/${tagged}/nfc`).set('Authorization', as('admin')).expect(409);
    expect((await http.get(`/organizations/${orgId}/objects?nfc=with&archived=true`).set('Authorization', as('member')).expect(200)).body).toHaveLength(1);
  });

  it('renames the organization (admin only, 1 to 80 chars)', async () => {
    const patch = (who: Name, name: unknown) => http.patch(`/organizations/${orgId}`).set('Authorization', as(who)).send({ name });
    await patch('member', 'Nope').expect(403);
    await patch('outsider', 'Nope').expect(403);
    await patch('admin', '   ').expect(400);
    await patch('admin', 'x'.repeat(81)).expect(400);
    const body = (await patch('admin', '  Acme 2  ').expect(200)).body;
    expect(body).toMatchObject({ id: orgId, name: 'Acme 2', role: 'admin' });
    expect((await http.get('/organizations').set('Authorization', as('member')).expect(200)).body[0].name).toBe('Acme 2');
  });
});
