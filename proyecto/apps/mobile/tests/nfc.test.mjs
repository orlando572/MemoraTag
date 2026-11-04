import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { encodeNfcIdentifier, decodeNfcIdentifier } from '../src/nfc-protocol.ts';
import { NfcSession } from '../src/nfc-session.ts';
import { objectIdFromQr, objectLink } from '../src/qr.ts';

const id = '123e4567-e89b-42d3-a456-426614174000';
const value = objectLink(id);
const legacy = `memoratag-local:v1:${id}`;
const ndef = createRequire(import.meta.url)('react-native-nfc-manager/dist/ndef-lib');
const record = () => ({ tnf: 1, type: [0x55], payload: encodeNfcIdentifier(value).slice(4) });
const legacyRecord = () => ({ tnf: 1, type: [0x54], payload: ndef.encodeMessage([ndef.textRecord(legacy, 'en')]).slice(4) });
function adapter(overrides = {}) {
  const calls = [];
  return { calls, isSupported: async () => true, isEnabled: async () => true, start: async () => {}, request: async () => {}, tag: async () => ({ isWritable: true, maxSize: 504 }), status: async () => ({ writable: true, capacity: 504 }), write: async () => { calls.push('write'); }, read: async () => [record()], cancel: async () => { calls.push('cancel'); }, ...overrides };
}

test('el QR usa un enlace profundo y acepta el formato anterior', () => {
  assert.equal(value, `memoratag://objeto/${id}`);
  assert.equal(objectIdFromQr(value), id);
  assert.equal(objectIdFromQr(value.toUpperCase().replace('MEMORATAG://OBJETO/', 'memoratag://objeto/')), id);
  assert.equal(objectIdFromQr(`${value}/`), id);
  assert.equal(objectIdFromQr(legacy), id);
  assert.equal(objectIdFromQr('memoratag://objeto/no-es-un-uuid'), null);
  assert.equal(objectIdFromQr(`https://ejemplo.com/objeto/${id}`), null);
  assert.equal(objectIdFromQr(''), null);
});

test('la etiqueta guarda un registro URI estándar sin datos privados', () => {
  const bytes = encodeNfcIdentifier(value);
  assert.deepEqual(bytes.slice(0, 4), [0xd1, 1, bytes.length - 4, 0x55]);
  assert.deepEqual(bytes, ndef.encodeMessage([ndef.uriRecord(value)]));
  assert.equal(decodeNfcIdentifier([record()]), id);
  assert.equal(decodeNfcIdentifier([{ ...record(), type: 'U' }]), id);
  assert.equal(decodeNfcIdentifier([]), null);
  assert.equal(decodeNfcIdentifier([record(), record()]), null);
  assert.equal(decodeNfcIdentifier([{ ...record(), payload: [0x04, ...record().payload.slice(1)] }]), null);
  assert.equal(decodeNfcIdentifier([{ ...record(), tnf: 2 }]), null);
  assert.equal(decodeNfcIdentifier([{ tnf: 1, type: [0x55], payload: ndef.encodeMessage([ndef.uriRecord('https://ejemplo.com')]).slice(4) }]), null);
  assert.throws(() => encodeNfcIdentifier('https://ejemplo.com'), /INVALID_IDENTIFIER/);
  assert.throws(() => encodeNfcIdentifier(legacy), /INVALID_IDENTIFIER/);
});

test('sigue leyendo etiquetas de texto escritas por la versión 1', () => {
  assert.equal(decodeNfcIdentifier([legacyRecord()]), id);
  assert.equal(decodeNfcIdentifier([{ ...legacyRecord(), payload: [0x82, 101, 110, 65] }]), null);
  assert.equal(decodeNfcIdentifier([{ ...legacyRecord(), payload: [0x3f, 101] }]), null);
  assert.equal(decodeNfcIdentifier([{ tnf: 1, type: [0x54], payload: ndef.encodeMessage([ndef.textRecord(value, 'en')]).slice(4) }]), null);
});

test('lee identificador y libera la sesión', async () => {
  const device = adapter();
  assert.equal(await new NfcSession(device).run('read'), id);
  assert.deepEqual(device.calls, ['cancel']);
});

test('escribe solo si la lectura posterior coincide', async () => {
  const device = adapter();
  const phases = [];
  assert.equal(await new NfcSession(device, (phase) => phases.push(phase)).run('write', value), id);
  assert.deepEqual(phases, ['checking', 'waiting', 'checkingTag', 'writing', 'verifying']);
  assert.deepEqual(device.calls, ['write', 'cancel']);
  const failed = adapter({ read: async () => [] });
  await assert.rejects(new NfcSession(adapter({ read: async () => [legacyRecord()] })).run('write', objectLink('00000000-0000-4000-8000-000000000000')), /WRITE_UNCONFIRMED/);
  await assert.rejects(new NfcSession(failed).run('write', value), /WRITE_UNCONFIRMED/);
  assert.deepEqual(failed.calls, ['write', 'cancel']);
});

test('rechaza etiquetas protegidas o pequeñas sin escribir', async () => {
  for (const status of [{ writable: false, capacity: 504 }, { writable: true, capacity: 2 }]) {
    const device = adapter({ status: async () => status });
    await assert.rejects(new NfcSession(device).run('write', value), /READ_ONLY|CAPACITY/);
    assert.deepEqual(device.calls, ['cancel']);
  }
});

test('detecta NFC apagado y etiquetas no reconocidas', async () => {
  await assert.rejects(new NfcSession(adapter({ isSupported: async () => false })).run('read'), /UNSUPPORTED/);
  await assert.rejects(new NfcSession(adapter({ isEnabled: async () => false })).run('read'), /DISABLED/);
  const device = adapter({ read: async () => [] });
  await assert.rejects(new NfcSession(device).run('read'), /INVALID_TAG/);
  assert.deepEqual(device.calls, ['cancel']);
});

test('no interrumpe la escritura y exige verificarla', async () => {
  let finish;
  let started;
  const writing = new Promise((resolve) => { started = resolve; });
  const device = adapter({ write: () => { device.calls.push('write'); started(); return new Promise((resolve) => { finish = resolve; }); } });
  const session = new NfcSession(device);
  const operation = session.run('write', value);
  await writing;
  assert.equal(await session.cancel(), false);
  finish();
  assert.equal(await operation, id);
  assert.deepEqual(device.calls, ['write', 'cancel']);
});

test('cancelar una solicitud pendiente no escribe y libera la sesión', async () => {
  let rejectRequest;
  let started;
  const requested = new Promise((resolve) => { started = resolve; });
  const device = adapter({ request: () => { started(); return new Promise((_, reject) => { rejectRequest = reject; }); }, cancel: async () => { device.calls.push('cancel'); rejectRequest?.(new Error('native cancelled')); } });
  const session = new NfcSession(device);
  const operation = session.run('write', value);
  await requested;
  await session.cancel();
  await assert.rejects(operation, /CANCELLED/);
  assert.ok(!device.calls.includes('write'));
  assert.ok(device.calls.includes('cancel'));
});
