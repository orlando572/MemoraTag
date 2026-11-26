import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CompanyError, companyMessage, kindFromStatus, photoUploadMessage, toCompanyError } from '../src/company/errors.ts';
import { lookupMessages, lookupOutcome, scanTarget } from '../src/company/scan.ts';

test('el estado HTTP se traduce a un tipo de error con mensaje en español', () => {
  assert.equal(kindFromStatus(401), 'auth');
  assert.equal(kindFromStatus(403), 'forbidden');
  assert.equal(kindFromStatus(404), 'not_found');
  assert.equal(kindFromStatus(409), 'conflict');
  assert.equal(kindFromStatus(400), 'invalid');
  assert.equal(kindFromStatus(500), 'server');
  assert.match(companyMessage('offline'), /Necesitas conexión para ver los objetos de la empresa/);
  assert.match(companyMessage('auth'), /Inicia sesión de nuevo/);
});

test('un error desconocido se trata como error del servicio', () => {
  assert.equal(toCompanyError(new Error('x')).kind, 'server');
  assert.equal(toCompanyError(new CompanyError('offline')).kind, 'offline');
});

test('la base local tiene prioridad al escanear', () => {
  assert.equal(scanTarget('active', true), 'local');
  assert.equal(scanTarget('archived', true), 'archived');
  assert.equal(scanTarget('missing', true), 'company-lookup');
  assert.equal(scanTarget('missing', false), 'missing');
});

test('el resultado de GET /objects/:id decide abrir la ficha o el mensaje habitual', () => {
  assert.equal(lookupOutcome(200), 'company');
  assert.equal(lookupOutcome(404), 'missing');
  assert.equal(lookupOutcome(403), 'missing');
  assert.equal(lookupOutcome(401), 'auth');
  assert.equal(lookupOutcome(500), 'error');
  assert.equal(lookupOutcome(null), 'offline');
});

test('el teléfono siempre se consulta primero; la empresa solo si el objeto no está aquí', () => {
  assert.equal(scanTarget('active', true), 'local');
  assert.equal(scanTarget('missing', true), 'company-lookup');
  assert.equal(scanTarget('missing', false), 'missing');
});

test('si la empresa tarda demasiado se explica y se puede reintentar', () => {
  assert.match(lookupMessages.timeout, /tarda demasiado/);
  assert.match(lookupMessages.timeout, /vuelve a intentarlo/);
});

test('si falla la foto, el mensaje habla de la foto y no de ver los objetos', () => {
  assert.match(photoUploadMessage('offline'), /enviar la foto/);
  assert.doesNotMatch(photoUploadMessage('offline'), /ver los objetos/);
  assert.match(photoUploadMessage('too_large'), /5 MB/);
  assert.match(photoUploadMessage('invalid'), /leer la foto/);
  assert.equal(photoUploadMessage('forbidden'), companyMessage('forbidden'));
});
