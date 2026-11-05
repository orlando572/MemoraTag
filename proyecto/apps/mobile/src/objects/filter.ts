// Pure helpers for the home list. No React Native imports, so tests/home-filter.test.mjs can run them.

export type ObjectFilter = 'all' | 'issues';
type Filterable = { name: string; description: string; open_issues?: number };

/** Lowercase text without accents, so «bicicleta» finds «Bicicleta» and «camara» finds «Cámara». */
export function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function hasOpenIssues(object: Pick<Filterable, 'open_issues'>) {
  return (object.open_issues ?? 0) > 0;
}

/** How many objects have at least one open incident (not the number of incidents). */
export function countWithOpenIssues(objects: Pick<Filterable, 'open_issues'>[]) {
  return objects.filter(hasOpenIssues).length;
}

/**
 * The «Con incidencias» filter only exists while some object has an open incident. If the last one
 * is resolved, the list goes back to showing everything instead of staying empty.
 */
export function effectiveFilter(filter: ObjectFilter, withIssues: number): ObjectFilter {
  return filter === 'issues' && withIssues > 0 ? 'issues' : 'all';
}

export function filterObjects<T extends Filterable>(objects: T[], query: string, filter: ObjectFilter): T[] {
  const q = normalize(query.trim());
  return objects.filter((item) => (filter === 'all' || hasOpenIssues(item)) && (!q || normalize(`${item.name} ${item.description}`).includes(q)));
}
