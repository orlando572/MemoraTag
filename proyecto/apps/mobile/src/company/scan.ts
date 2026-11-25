// Decides what to do with a scanned QR/NFC id. Pure, so it can be tested without a device.
export type LocalState = 'active' | 'archived' | 'missing';
export type ScanTarget = 'local' | 'archived' | 'company-lookup' | 'missing';
export type LookupOutcome = 'company' | 'missing' | 'auth' | 'offline' | 'error';

/** The local database always wins; the company is only asked for ids that do not exist locally. */
export function scanTarget(local: LocalState, hasCompanySession: boolean): ScanTarget {
  if (local === 'active') return 'local';
  if (local === 'archived') return 'archived';
  return hasCompanySession ? 'company-lookup' : 'missing';
}

/** Maps the result of GET /objects/:id (HTTP status, or null when there was no connection). */
export function lookupOutcome(status: number | null): LookupOutcome {
  if (status === null) return 'offline';
  if (status >= 200 && status < 300) return 'company';
  if (status === 404 || status === 403) return 'missing';
  if (status === 401) return 'auth';
  return 'error';
}

export const lookupMessages: Record<Exclude<LookupOutcome, 'company'>, string> = {
  missing: 'Este objeto no está en este teléfono.',
  offline: 'Este objeto no está en este teléfono. Para buscarlo en tu empresa necesitas conexión.',
  auth: 'Este objeto no está en este teléfono. Inicia sesión de nuevo en Ajustes para buscarlo en tu empresa.',
  error: 'Este objeto no está en este teléfono y no se pudo consultar tu empresa. Vuelve a intentarlo.',
};
