import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canWriteNfc, documentIcon, formatSize, photoUpload, splitFiles } from '../src/company/files.ts';

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
