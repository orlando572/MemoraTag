const dateFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeZone: 'Europe/Madrid' });

export function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date);
}
