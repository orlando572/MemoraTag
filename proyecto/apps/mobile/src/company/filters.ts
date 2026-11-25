// Pure helpers for the company home: filters, query string and scan order. No React Native imports.
export type StatusFilter = 'in_use' | 'in_repair' | 'retired';
export type CompanyFilters = { q: string; status: StatusFilter | null; location: string; category: string };

export const emptyFilters: CompanyFilters = { q: '', status: null, location: '', category: '' };

/** Query string for GET /organizations/:orgId/objects (empty values are left out). */
export function buildQuery(filters: CompanyFilters) {
  const params: string[] = [];
  const add = (key: string, value: string | null) => { const text = value?.trim(); if (text) params.push(`${key}=${encodeURIComponent(text)}`); };
  add('q', filters.q);
  add('status', filters.status);
  add('location', filters.location);
  add('category', filters.category);
  return params.length ? `?${params.join('&')}` : '';
}

/** Distinct non-empty values of a field, case-insensitive, sorted with Spanish rules. */
export function distinctValues<T>(items: T[], pick: (item: T) => string | null | undefined) {
  const seen = new Map<string, string>();
  for (const item of items) {
    const value = pick(item)?.trim();
    if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

/** Filters shown as removable chips (status has its own counters, search its own box). */
export function activeChips(filters: CompanyFilters) {
  const chips: { key: 'location' | 'category'; label: string }[] = [];
  if (filters.location.trim()) chips.push({ key: 'location', label: `Ubicación: ${filters.location.trim()}` });
  if (filters.category.trim()) chips.push({ key: 'category', label: `Categoría: ${filters.category.trim()}` });
  return chips;
}

export type ScanSource = 'company' | 'local';

/** Where a scanned id is looked up, in order. In company mode the company comes first. */
export function scanOrder(companyMode: boolean, companyConfigured: boolean): ScanSource[] {
  if (companyMode) return ['company', 'local'];
  return companyConfigured ? ['local', 'company'] : ['local'];
}
