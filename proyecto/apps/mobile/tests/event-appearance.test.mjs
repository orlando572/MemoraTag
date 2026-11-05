import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eventAppearance } from '../src/ui/event-types.ts';
import { dark, light } from '../src/ui/tokens.ts';

test('una incidencia abierta se ve como incidencia, con su color de estado', () => {
  const open = eventAppearance({ type: 'issue', resolved_at: null }, light);
  assert.equal(open.icon, 'alert-circle-outline');
  assert.equal(open.color, light.danger);
});

test('una incidencia resuelta cambia a icono de check y color de resuelto, en claro y oscuro', () => {
  for (const palette of [light, dark]) {
    const done = eventAppearance({ type: 'issue', resolved_at: '2026-11-04T10:00:00.000Z' }, palette);
    assert.equal(done.icon, 'checkmark-circle-outline');
    assert.equal(done.color, palette.success);
    assert.equal(done.label, 'Incidencia resuelta');
  }
});

test('resolved_at solo importa en las incidencias', () => {
  const note = eventAppearance({ type: 'note', resolved_at: '2026-11-04T10:00:00.000Z' }, light);
  assert.equal(note.icon, 'document-text-outline');
  assert.equal(note.color, light.muted);
  const maintenance = eventAppearance({ type: 'maintenance', resolved_at: null }, light);
  assert.equal(maintenance.color, light.warning);
});
