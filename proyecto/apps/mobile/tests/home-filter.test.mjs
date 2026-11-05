import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countWithOpenIssues, effectiveFilter, filterObjects, normalize } from '../src/objects/filter.ts';

const objects = [
  { name: 'Bicicleta de ruta', description: 'Mi compañera de rutas', open_issues: 0 },
  { name: 'Mause Logitech', description: 'Inalámbrico', open_issues: 2 },
  { name: 'Cámara analógica', description: 'Canon AE-1', open_issues: 0 },
  { name: 'Guitarra', description: '' },
];

test('la búsqueda ignora tildes y mayúsculas', () => {
  assert.equal(normalize('CÁMARA'), 'camara');
  assert.deepEqual(filterObjects(objects, 'camara', 'all').map((o) => o.name), ['Cámara analógica']);
  assert.deepEqual(filterObjects(objects, '  INALAMBRICO ', 'all').map((o) => o.name), ['Mause Logitech']);
});

test('sin búsqueda ni filtro se devuelven todos en su orden', () => {
  assert.equal(filterObjects(objects, '', 'all').length, 4);
  assert.deepEqual(filterObjects(objects, '   ', 'all'), objects);
});

test('«Con incidencias» deja solo los objetos con incidencias abiertas', () => {
  assert.deepEqual(filterObjects(objects, '', 'issues').map((o) => o.name), ['Mause Logitech']);
});

test('filtro y búsqueda se combinan', () => {
  assert.equal(filterObjects(objects, 'bici', 'issues').length, 0);
  assert.deepEqual(filterObjects(objects, 'mause', 'issues').map((o) => o.name), ['Mause Logitech']);
});

test('cuenta objetos con incidencias, no incidencias; un dato ausente es cero', () => {
  assert.equal(countWithOpenIssues(objects), 1);
  assert.equal(countWithOpenIssues([{ open_issues: 5 }, { open_issues: 1 }]), 2);
  assert.equal(countWithOpenIssues([{}]), 0);
});

test('el filtro vuelve a «Todos» cuando ya no quedan incidencias', () => {
  assert.equal(effectiveFilter('issues', 1), 'issues');
  assert.equal(effectiveFilter('issues', 0), 'all');
  assert.equal(effectiveFilter('all', 3), 'all');
});
