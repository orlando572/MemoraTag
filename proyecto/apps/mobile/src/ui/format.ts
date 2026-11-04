// Date helpers. Event dates are stored as local YYYY-MM-DD; timestamps as ISO strings.

export function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseLocal(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Converts an ISO timestamp to the local calendar day (YYYY-MM-DD). */
export function dayOf(iso: string) {
  return localDate(new Date(iso));
}

/** Full date for screen readers and detail views: «4 de noviembre de 2026». */
export function formatDate(day: string) {
  return parseLocal(day).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Short, glanceable date: Hoy, Ayer, Hace 3 días, Hace 2 semanas, then the full date. */
export function relativeDate(day: string, today: Date = new Date()) {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(today) - start(parseLocal(day))) / 86_400_000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days === -1) return 'Mañana';
  if (days > 1 && days < 7) return `Hace ${days} días`;
  if (days >= 7 && days < 30) { const weeks = Math.floor(days / 7); return weeks === 1 ? 'Hace 1 semana' : `Hace ${weeks} semanas`; }
  if (days >= 30 && days < 365) { const months = Math.floor(days / 30); return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`; }
  return formatDate(day);
}

/** Month heading for the grouped timeline: «Noviembre de 2026». */
export function monthLabel(day: string) {
  const label = parseLocal(day).toLocaleDateString('es', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
