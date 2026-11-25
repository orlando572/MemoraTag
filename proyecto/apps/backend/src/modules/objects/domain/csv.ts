import type { InventoryObject } from '@memoratag/contracts';

const COLUMNS: (keyof InventoryObject)[] = ['id', 'name', 'internal_code', 'category', 'location', 'assignee', 'status', 'description', 'created_at'];

function cell(value: unknown): string {
  let s = value == null ? '' : String(value);
  // Neutralize spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function objectsToCsv(objects: InventoryObject[]): string {
  const rows = [COLUMNS.join(','), ...objects.map((o) => COLUMNS.map((c) => cell(o[c])).join(','))];
  return rows.join('\r\n') + '\r\n';
}
