import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canCreateObjects, uploadResize, canWriteNfc, documentIcon, formatSize, photoKey, photoUpload, splitFiles } from '../src/company/files.ts';

test('los adjuntos se separan en fotos y documentos', () => {
  const files = [{ id: '1', kind: 'photo' }, { id: '2', kind: 'document' }, { id: '3', kind: 'photo' }];
  const { photos, documents } = splitFiles(files);
  assert.deepEqual(photos.map((f) => f.id), ['1', '3']);
  assert.deepEqual(documents.map((f) => f.id), ['2']);
});

test('el tamaño se muestra en B, KB o MB', () => {
  assert.equal(formatSize(500), '500 B');
  assert.equal(formatSize(2048), '2 KB');
  assert.equal(formatSize(3 * 1024 * 1024), '3.0 MB');
});

test('el icono depende del tipo de documento', () => {
  assert.equal(documentIcon({ name: 'a.pdf', mime: 'application/pdf' }), 'document-text-outline');
  assert.equal(documentIcon({ name: 'a.xlsx', mime: 'application/octet-stream' }), 'grid-outline');
  assert.equal(documentIcon({ name: 'a.bin', mime: 'x/y' }), 'document-attach-outline');
});

test('solo se suben fotos en formatos que acepta el servidor', () => {
  assert.deepEqual(photoUpload({ uri: 'file:///a/b.jpg', mimeType: 'image/jpeg', fileName: 'b.jpg' }), { type: 'image/jpeg', name: 'b.jpg' });
  assert.deepEqual(photoUpload({ uri: 'file:///a/b.png' }), { type: 'image/png', name: 'foto.png' });
  assert.equal(photoUpload({ uri: 'file:///a/b.heic', mimeType: 'image/heic' }), null);
  assert.equal(photoUpload({ uri: 'file:///a/b.gif' }), null);
});

test('escribir NFC es solo para administradores', () => {
  assert.equal(canWriteNfc('admin'), true);
  assert.equal(canWriteNfc('member'), false);
  assert.equal(canWriteNfc(undefined), false);
});

test('solo el administrador puede crear objetos desde el móvil', () => {
  assert.equal(canCreateObjects('admin'), true);
  assert.equal(canCreateObjects('member'), false);
  assert.equal(canCreateObjects(null), false);
  assert.equal(canCreateObjects(undefined), false);
});

test('la clave de la foto cambia al reemplazarla y es nula sin foto', () => {
  assert.equal(photoKey({ id: 'o1', photo_updated_at: null }), null);
  assert.equal(photoKey({ id: 'o1' }), null);
  const first = photoKey({ id: 'o1', photo_updated_at: '2026-11-26T10:00:00.000Z' });
  const second = photoKey({ id: 'o1', photo_updated_at: '2026-11-26T11:00:00.000Z' });
  assert.ok(first && second && first !== second);
});

test('las fotos grandes se reducen a 1600 px por el lado largo y las pequeñas no se tocan', () => {
  assert.deepEqual(uploadResize(8160, 6120), { width: 1600 });
  assert.deepEqual(uploadResize(3000, 4000), { height: 1600 });
  assert.deepEqual(uploadResize(4000, 4000), { width: 1600 });
  assert.equal(uploadResize(1200, 900), null);
  assert.equal(uploadResize(1600, 1600), null);
  assert.equal(uploadResize(undefined, 900), null);
});
