import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { BACKUP_LIMITS, validateBackup } from '../src/backup-format.ts';
import { planBackupMerge } from '../src/backup-merge.ts';
import { writeBackupRows } from '../src/backup-sql.ts';

const digest = async (text) => createHash('sha256').update(text).digest('hex');
const objectId = '123e4567-e89b-42d3-a456-426614174000';
const eventId = '123e4567-e89b-42d3-a456-426614174001';
const photo = '123e4567-e89b-42d3-a456-426614174002.jpg';
async function sample() {
  const base64 = Buffer.from('foto').toString('base64');
  return { format: 'memoratag-backup', version: 1, appVersion: '0.1.0', exportedAt: '2026-01-01T00:00:00.000Z', profile: { name: 'Ana' }, objects: [{ id: objectId, name: 'Bici', description: '', created_at: '2026-01-01T00:00:00.000Z', archived_at: null, cover_image: photo, color: '#DCEBE2' }], events: [{ id: eventId, object_id: objectId, title: 'Nota', description: '', created_at: '2026-01-01T00:00:00.000Z', type: 'note', event_date: '2026-01-01', photo: null, document_file: null, document_name: null }], files: [{ key: `photos/${photo}`, size: 4, sha256: await digest(base64), base64 }] };
}

test('valida datos y archivos sin cambiar identificadores', async () => {
  const data = await sample();
  assert.deepEqual(await validateBackup(data, digest), data);
});

test('rechaza contenido manipulado, archivo ausente y ruta insegura', async () => {
  const corrupt = await sample(); corrupt.files[0].base64 = Buffer.from('otra').toString('base64');
  await assert.rejects(validateBackup(corrupt, digest), /INVALID_BACKUP/);
  const missing = await sample(); missing.files = [];
  await assert.rejects(validateBackup(missing, digest), /INVALID_BACKUP/);
  const traversal = await sample(); traversal.objects[0].cover_image = '../foto.jpg';
  await assert.rejects(validateBackup(traversal, digest), /INVALID_BACKUP/);
});

test('rechaza relaciones rotas, duplicados y versiones incompatibles', async () => {
  const broken = await sample(); broken.events[0].object_id = eventId;
  await assert.rejects(validateBackup(broken, digest), /INVALID_BACKUP/);
  const duplicate = await sample(); duplicate.objects.push({ ...duplicate.objects[0] });
  await assert.rejects(validateBackup(duplicate, digest), /INVALID_BACKUP/);
  const newer = await sample(); newer.version = 2;
  await assert.rejects(validateBackup(newer, digest), /INVALID_BACKUP/);
});

test('rechaza tamaños y fechas inválidos', async () => {
  const tooLarge = await sample(); tooLarge.files[0].size = BACKUP_LIMITS.fileBytes + 1;
  await assert.rejects(validateBackup(tooLarge, digest), /INVALID_BACKUP/);
  const invalidDate = await sample(); invalidDate.events[0].event_date = '2026-02-30';
  await assert.rejects(validateBackup(invalidDate, digest), /INVALID_BACKUP/);
});

test('planifica importación repetida sin duplicar ni comparar rutas internas', async () => {
  const current = await sample();
  const incoming = await sample();
  const otherName = '123e4567-e89b-42d3-a456-426614174003.jpg';
  incoming.objects[0].cover_image = otherName;
  incoming.files[0].key = `photos/${otherName}`;
  const plan = planBackupMerge(current, incoming);
  assert.equal(plan.unchangedObjects, 1);
  assert.equal(plan.unchangedEvents, 1);
  assert.equal(plan.objectConflicts.length, 0);
});

test('detecta cambios de archivo, nombre y estado archivado', async () => {
  const current = await sample();
  const incoming = await sample();
  incoming.objects[0].archived_at = '2026-01-02T00:00:00.000Z';
  incoming.objects[0].name = 'Otra bici';
  incoming.files[0].base64 = Buffer.from('otra').toString('base64');
  incoming.files[0].sha256 = await digest(incoming.files[0].base64);
  const plan = planBackupMerge(current, incoming);
  assert.equal(plan.archiveChanges, 1);
  assert.deepEqual(plan.objectConflicts[0].fields, ['name', 'archived_at', 'cover_image']);
});

function database() {
  const db = new DatabaseSync(':memory:');
  db.exec(`PRAGMA foreign_keys = ON;
    CREATE TABLE objects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, created_at TEXT NOT NULL, archived_at TEXT, cover_image TEXT, color TEXT NOT NULL);
    CREATE TABLE events (id TEXT PRIMARY KEY, object_id TEXT NOT NULL REFERENCES objects(id), title TEXT NOT NULL, description TEXT NOT NULL, created_at TEXT NOT NULL, type TEXT NOT NULL, event_date TEXT, photo TEXT, document_file TEXT, document_name TEXT);
    CREATE TABLE local_profile (id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT NOT NULL);`);
  return db;
}

async function transact(db, objects, events, profile) {
  db.exec('BEGIN');
  try {
    await writeBackupRows(async (sql, ...values) => db.prepare(sql).run(...values), objects, events, profile);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

test('importar dos veces conserva identificadores y no duplica registros', async () => {
  const data = await sample();
  const db = database();
  try {
    await transact(db, data.objects, data.events, data.profile.name);
    await transact(db, data.objects, data.events, data.profile.name);
    assert.equal(db.prepare('SELECT count(*) AS count FROM objects').get().count, 1);
    assert.equal(db.prepare('SELECT count(*) AS count FROM events').get().count, 1);
    assert.equal(db.prepare('SELECT object_id FROM events').get().object_id, objectId);
  } finally { db.close(); }
});

test('fallo de integridad revierte objetos, eventos y perfil', async () => {
  const data = await sample();
  const db = database();
  try {
    await transact(db, data.objects, data.events, 'Nombre original');
    const badObject = { ...data.objects[0], name: 'Cambio que no debe guardarse' };
    const badEvent = { ...data.events[0], object_id: '123e4567-e89b-42d3-a456-426614174099' };
    await assert.rejects(transact(db, [badObject], [badEvent], 'Otro nombre'));
    assert.equal(db.prepare('SELECT name FROM objects').get().name, 'Bici');
    assert.equal(db.prepare('SELECT object_id FROM events').get().object_id, objectId);
    assert.equal(db.prepare('SELECT name FROM local_profile').get().name, 'Nombre original');
  } finally { db.close(); }
});
