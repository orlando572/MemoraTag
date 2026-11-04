import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { encodeNfcIdentifier, decodeNfcIdentifier } from '../src/nfc-protocol.ts';
import { NfcSession } from '../src/nfc-session.ts';

const value = 'memoratag-local:v1:123e4567-e89b-42d3-a456-426614174000';
const ndef = createRequire(import.meta.url)('react-native-nfc-manager/dist/ndef-lib');
const record = () => ({ tnf: 1, type: [84], payload: encodeNfcIdentifier(value).slice(4) });
function adapter(overrides = {}) {
  const calls = [];
  return { calls, isSupported: async () => true, isEnabled: async () => true, start: async () => {}, request: async () => {}, tag: async () => ({ isWritable: true, maxSize: 504 }), status: async () => ({ writable: true, capacity: 504 }), write: async () => { calls.push('write'); }, read: async () => [record()], cancel: async () => { calls.push('cancel'); }, ...overrides };
}

test('identificador NDEF se codifica y valida sin datos privados', () => {
  const bytes = encodeNfcIdentifier(value);
  assert.deepEqual(bytes.slice(0, 4), [0xd1, 1, bytes.length - 4, 0x54]);
  assert.deepEqual(bytes, ndef.encodeMessage([ndef.textRecord(value, 'en')]));
  assert.equal(decodeNfcIdentifier([record()]), value);
  assert.equal(decodeNfcIdentifier([]), null);
  assert.equal(decodeNfcIdentifier([{ ...record(), type: [85] }]), null);
  assert.equal(decodeNfcIdentifier([record(), record()]), null);
  assert.equal(decodeNfcIdentifier([{ ...record(), payload: [0x82, 101, 110, 65] }]), null);
  assert.equal(decodeNfcIdentifier([{ ...record(), payload: [0x3f, 101] }]), null);
  assert.throws(() => encodeNfcIdentifier('https://ejemplo.com'), /INVALID_IDENTIFIER/);
});

test('lee identificador y libera la sesión', async () => {
  const device = adapter();
  assert.equal(await new NfcSession(device).run('read'), value);
  assert.deepEqual(device.calls, ['cancel']);
});

test('escribe solo si la lectura posterior coincide', async () => {
  const device = adapter();
  const phases = [];
  assert.equal(await new NfcSession(device, (phase) => phases.push(phase)).run('write', value), value);
  assert.deepEqual(phases, ['checking', 'waiting', 'checkingTag', 'writing', 'verifying']);
  assert.deepEqual(device.calls, ['write', 'cancel']);
  const failed = adapter({ read: async () => [] });
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
  assert.equal(await operation, value);
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
