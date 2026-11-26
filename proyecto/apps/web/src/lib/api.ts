import {
  InventoryObjectSchema,
  MemberSchema,
  ObjectEventSchema,
  EventFileSchema,
  OrganizationSchema,
  OrganizationSummarySchema,
  type AddMemberInput,
  type ChangeStatusInput,
  type CreateEventInput,
  type CreateObjectInput,
  type CreateOrganizationInput,
  type ObjectFilters,
  type Role,
  type UpdateObjectInput,
} from '@memoratag/contracts';
import { z } from 'zod';
import { env } from '@/lib/env';

// The role-change endpoint answers without the email.
// Events may carry the author's email (optional until the contracts include it).
// Objects may carry the date the NFC tag was written (optional until the contracts include it).
const WebObjectSchema = InventoryObjectSchema.extend({ nfc_written_at: z.string().nullish() });
export type WebObject = z.infer<typeof WebObjectSchema>;
export type ListFilters = ObjectFilters & { archived?: boolean; nfc?: 'with' | 'without' };
const WebEventSchema = ObjectEventSchema.extend({ created_by_email: z.string().nullish() });
export type WebEvent = z.infer<typeof WebEventSchema>;
const MemberRoleSchema = z.object({ user_id: z.string(), role: MemberSchema.shape.role });

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const messages: Record<number, string> = {
  400: 'Los datos enviados no son válidos. Revísalos e inténtalo de nuevo.',
  401: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
  403: 'No tienes permiso para hacer esto.',
  404: 'No hemos encontrado lo que buscas.',
  413: 'El archivo es demasiado grande (máximo 5 MB).',
  409: 'Esta acción choca con el estado actual (por ejemplo, ya existe o no se puede completar).',
};

function messageFor(status: number) {
  return messages[status] ?? (status >= 500 ? 'El servidor ha tenido un problema. Inténtalo de nuevo en unos minutos.' : 'No se pudo completar la acción.');
}

export type TokenGetter = () => Promise<string | null>;

/** Typed API client. `getToken` returns the Supabase access token (server or browser). */
export function createApi(getToken: TokenGetter) {
  async function request(method: string, path: string, schema: z.ZodType | 'blob' | null, body?: unknown): Promise<unknown> {
    const token = await getToken();
    if (!token) throw new ApiError(401, messages[401]);
    let res: Response;
    try {
      res = await fetch(`${env.apiUrl}${path}`, {
        method,
        cache: 'no-store',
        // FormData sets its own multipart Content-Type (with boundary).
        headers: { Authorization: `Bearer ${token}`, ...(body === undefined || body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, 'No se pudo conectar con el servidor. Comprueba tu conexión.');
    }
    if (!res.ok) throw new ApiError(res.status, messageFor(res.status));
    if (!schema || res.status === 204) return undefined;
    if (schema === 'blob') return res.blob();
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) throw new ApiError(502, 'La respuesta del servidor no tiene el formato esperado.');
    return parsed.data;
  }

  const get = async <S extends z.ZodType>(path: string, schema: S) => (await request('GET', path, schema)) as z.infer<S>;
  const send = async <S extends z.ZodType>(method: string, path: string, schema: S, body?: unknown) => (await request(method, path, schema, body)) as z.infer<S>;

  const query = (filters: ListFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, String(value)));
    const text = params.toString();
    return text ? `?${text}` : '';
  };

  return {
    organizations: {
      list: () => get('/organizations', z.array(OrganizationSchema)),
      rename: (orgId: string, name: string) => send('PATCH', `/organizations/${orgId}`, OrganizationSchema, { name }),
      create: (input: CreateOrganizationInput) => send('POST', '/organizations', OrganizationSchema, input),
      members: (orgId: string) => get(`/organizations/${orgId}/members`, z.array(MemberSchema)),
      addMember: (orgId: string, input: AddMemberInput) => send('POST', `/organizations/${orgId}/members`, MemberSchema, input),
      changeRole: (orgId: string, userId: string, role: Role) => send('PATCH', `/organizations/${orgId}/members/${userId}`, MemberRoleSchema, { role }),
      removeMember: (orgId: string, userId: string) => request('DELETE', `/organizations/${orgId}/members/${userId}`, null),
      summary: (orgId: string) => get(`/organizations/${orgId}/summary`, OrganizationSummarySchema),
    },
    objects: {
      list: (orgId: string, filters?: ListFilters) => get(`/organizations/${orgId}/objects${query(filters)}`, z.array(WebObjectSchema)),
      create: (orgId: string, input: CreateObjectInput) => send('POST', `/organizations/${orgId}/objects`, WebObjectSchema, input),
      exportCsv: async (orgId: string) => (await request('GET', `/organizations/${orgId}/objects.csv`, 'blob')) as Blob,
      get: (id: string) => get(`/objects/${id}`, WebObjectSchema),
      update: (id: string, input: UpdateObjectInput) => send('PATCH', `/objects/${id}`, WebObjectSchema, input),
      restore: (id: string) => send('POST', `/objects/${id}/restore`, WebObjectSchema),
      remove: (id: string) => request('DELETE', `/objects/${id}`, null),
      archive: (id: string) => send('POST', `/objects/${id}/archive`, WebObjectSchema),
      changeStatus: (id: string, input: ChangeStatusInput) => send('PATCH', `/objects/${id}/status`, WebObjectSchema, input),
      events: (id: string) => get(`/objects/${id}/events`, z.array(WebEventSchema)),
      addEvent: (id: string, input: CreateEventInput) => send('POST', `/objects/${id}/events`, WebEventSchema, input),
      uploadPhoto: (id: string, file: File) => {
        const form = new FormData();
        form.append('file', file);
        return send('POST', `/objects/${id}/photo`, WebObjectSchema, form);
      },
      photoUrl: (id: string) => get(`/objects/${id}/photo/url`, z.object({ url: z.string(), expires_in: z.number() })),
      removePhoto: (id: string) => send('DELETE', `/objects/${id}/photo`, WebObjectSchema),
    },
    files: {
      upload: (eventId: string, file: File) => {
        const form = new FormData();
        form.append('file', file);
        return send('POST', `/events/${eventId}/files`, EventFileSchema, form);
      },
      url: (fileId: string) => get(`/files/${fileId}/url`, z.object({ url: z.string(), expires_in: z.number() })),
      remove: (fileId: string) => request('DELETE', `/files/${fileId}`, null),
    },
  };
}

export type Api = ReturnType<typeof createApi>;

/** User-facing message for any thrown error; `overrides` replaces the text for specific statuses. */
export function errorMessage(error: unknown, overrides: Partial<Record<number, string>> = {}) {
  if (error instanceof ApiError) return overrides[error.status] ?? error.message;
  return 'Algo ha salido mal. Inténtalo de nuevo.';
}
