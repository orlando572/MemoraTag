import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dayOf, formatDate, localDate, monthLabel, relativeDate } from '../src/ui/format.ts';
import { guessIcon } from '../src/objects/icons.ts';
import { objectColor } from '../src/ui/tokens.ts';

const today = new Date(2026, 10, 4, 15, 30); // 4 Nov 2026, afternoon

test('fechas relativas fáciles de leer', () => {
  assert.equal(relativeDate('2026-11-04', today), 'Hoy');
  assert.equal(relativeDate('2026-11-03', today), 'Ayer');
  assert.equal(relativeDate('2026-11-01', today), 'Hace 3 días');
  assert.equal(relativeDate('2026-10-28', today), 'Hace 1 semana');
  assert.equal(relativeDate('2026-10-14', today), 'Hace 3 semanas');
  assert.equal(relativeDate('2026-09-01', today), 'Hace 2 meses');
  assert.equal(relativeDate('2024-05-10', today), formatDate('2024-05-10'));
});

test('fechas completas y meses para agrupar la historia', () => {
  assert.equal(formatDate('2026-11-04'), '4 de noviembre de 2026');
  assert.equal(monthLabel('2026-11-04'), 'Noviembre de 2026');
  assert.equal(localDate(new Date(2026, 0, 9)), '2026-01-09');
  assert.equal(dayOf(new Date(2026, 10, 4, 23, 50).toISOString()), '2026-11-04');
});

test('icono por defecto según el nombre y colores anteriores', () => {
  assert.equal(guessIcon('Bicicleta de montaña'), 'bicycle');
  assert.equal(guessIcon('Guitarra'), 'music');
  assert.equal(guessIcon('Caldera'), 'home');
  assert.equal(guessIcon('Algo'), 'cube');
  assert.equal(objectColor('#DCEBE2').name, 'Salvia');
  assert.equal(objectColor('#fbefd9').name, 'Ámbar');
  assert.equal(objectColor('#123456').name, 'Petróleo');
});
