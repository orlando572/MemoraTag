import assert from 'node:assert/strict';
import { test } from 'node:test';
import { needsReplaceConfirm, nfcLabel, showJoinHelp } from '../src/company/nfc.ts';

test('la etiqueta del icono NFC depende de nfc_written_at', () => {
  assert.equal(nfcLabel(null), 'Sin etiqueta NFC');
  assert.equal(nfcLabel(undefined), 'Sin etiqueta NFC');
  assert.equal(nfcLabel('no es una fecha'), 'Sin etiqueta NFC');
  assert.match(nfcLabel('2026-11-25T12:00:00Z'), /^NFC vinculada · 25 nov 2026$/);
});

test('reescribir una etiqueta ya vinculada pide confirmación', () => {
  assert.equal(needsReplaceConfirm('2026-11-25T12:00:00Z'), true);
  assert.equal(needsReplaceConfirm(null), false);
});

test('la ayuda para unirse a una empresa solo sale con sesión y sin empresa', () => {
  assert.equal(showJoinHelp('signedIn', false, false), true);
  assert.equal(showJoinHelp('signedIn', true, false), false);
  assert.equal(showJoinHelp('signedIn', false, true), false);
  assert.equal(showJoinHelp('signedOut', false, false), false);
});
