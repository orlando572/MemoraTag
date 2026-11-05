import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countEvents, effectiveEventFilter, showTypeFilters, typesWithEvents } from '../src/objects/history.ts';

const mixed = [{ type: 'issue' }, { type: 'maintenance' }, { type: 'maintenance' }, { type: 'note' }];

test('cuenta los eventos por tipo y el total', () => {
  assert.deepEqual(countEvents(mixed), { all: 4, note: 1, issue: 1, maintenance: 2 });
  assert.deepEqual(countEvents([]), { all: 0, note: 0, issue: 0, maintenance: 0 });
});

test('solo se ofrecen los tipos que tienen eventos, sin chips con «0»', () => {
  assert.deepEqual(typesWithEvents(countEvents(mixed)), ['note', 'issue', 'maintenance']);
  assert.deepEqual(typesWithEvents(countEvents([{ type: 'issue' }, { type: 'issue' }, { type: 'note' }])), ['note', 'issue']);
});

test('los filtros solo aparecen con al menos dos tipos de evento', () => {
  assert.equal(showTypeFilters(countEvents([])), false);
  assert.equal(showTypeFilters(countEvents([{ type: 'issue' }])), false);
  assert.equal(showTypeFilters(countEvents([{ type: 'issue' }, { type: 'issue' }, { type: 'issue' }])), false);
  assert.equal(showTypeFilters(countEvents([{ type: 'issue' }, { type: 'note' }])), true);
});

test('un filtro sin eventos vuelve a «Todos» y uno con eventos se conserva', () => {
  const counts = countEvents([{ type: 'issue' }, { type: 'note' }]);
  assert.equal(effectiveEventFilter('issue', counts), 'issue');
  assert.equal(effectiveEventFilter('maintenance', counts), 'all');
  assert.equal(effectiveEventFilter('all', counts), 'all');
  assert.equal(effectiveEventFilter('issue', countEvents([])), 'all');
});
