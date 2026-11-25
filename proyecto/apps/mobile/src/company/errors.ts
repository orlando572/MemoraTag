// Error handling for the company API: HTTP status -> kind -> Spanish message. Pure, no React Native.
export type CompanyErrorKind = 'offline' | 'auth' | 'forbidden' | 'not_found' | 'conflict' | 'invalid' | 'server';

export class CompanyError extends Error {
  kind: CompanyErrorKind;
  constructor(kind: CompanyErrorKind) {
    super(kind);
    this.kind = kind;
  }
}

export function kindFromStatus(status: number): CompanyErrorKind {
  if (status === 401) return 'auth';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'invalid';
  return 'server';
}

const messages: Record<CompanyErrorKind, string> = {
  offline: 'Necesitas conexión para ver los objetos de la empresa.',
  auth: 'Tu sesión ha caducado. Inicia sesión de nuevo en Ajustes.',
  forbidden: 'No tienes permiso para hacer esto en esta empresa.',
  not_found: 'Este objeto no existe o no pertenece a tu empresa.',
  conflict: 'El objeto cambió mientras lo editabas. Vuelve a cargarlo e inténtalo de nuevo.',
  invalid: 'Los datos no son válidos. Revisa el formulario.',
  server: 'El servicio de la empresa no responde bien. Inténtalo más tarde.',
};

export function companyMessage(kind: CompanyErrorKind) {
  return messages[kind];
}

export function toCompanyError(error: unknown): CompanyError {
  return error instanceof CompanyError ? error : new CompanyError('server');
}
