import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activeChips, buildQuery, distinctValues, emptyFilters, scanOrder } from '../src/company/filters.ts';

test('la query solo incluye los filtros con valor y los codifica', () => {
  assert.equal(buildQuery(emptyFilters), '');
  assert.equal(buildQuery({ q: ' taladro ', status: 'in_repair', location: 'Nave 1', category: '' }), '?q=taladro&status=in_repair&location=Nave%201');
  assert.equal(buildQuery({ ...emptyFilters, category: 'Herramientas & más' }), '?category=Herramientas%20%26%20m%C3%A1s');
});

test('ubicaciones y categorías: distintas, sin vacíos y ordenadas', () => {
  const items = [{ l: 'Nave 2' }, { l: ' nave 1 ' }, { l: '' }, { l: null }, { l: 'NAVE 2' }, { l: 'Álamo' }, {}];
  assert.deepEqual(distinctValues(items, (i) => i.l), ['Álamo', 'nave 1', 'Nave 2']);
});

test('los filtros activos se muestran como chips quitables', () => {
  assert.deepEqual(activeChips(emptyFilters), []);
  assert.deepEqual(activeChips({ ...emptyFilters, location: 'Nave 1', category: 'Taller' }).map((c) => c.key), ['location', 'category']);
});

test('el orden de consulta al escanear depende del modo empresa', () => {
  assert.deepEqual(scanOrder(true, true), ['company', 'local']);
  assert.deepEqual(scanOrder(false, true), ['local', 'company']);
  assert.deepEqual(scanOrder(false, false), ['local']);
});
