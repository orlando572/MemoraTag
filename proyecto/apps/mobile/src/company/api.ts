import { EventFileSchema, InventoryObjectSchema, OrganizationSummarySchema, ObjectEventSchema, OrganizationSchema, type ChangeStatusInput, type CreateEventInput } from '@memoratag/contracts';
import { CompanyError, kindFromStatus } from './errors';
import { buildQuery, type CompanyFilters } from './filters';
import { apiUrl, supabase } from './supabase';
import { lookupOutcome, type LookupOutcome } from './scan';

async function token() {
  if (!supabase) throw new CompanyError('auth');
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new CompanyError('auth');
  return data.session.access_token;
}

async function send(path: string, init: { method?: string; body?: unknown } = {}) {
  const bearer = await token();
  try {
    return await fetch(`${apiUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: { Authorization: `Bearer ${bearer}`, Accept: 'application/json', ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch { throw new CompanyError('offline'); }
}

type Schema<T> = { safeParse: (value: unknown) => { success: true; data: T } | { success: false } };

async function request<T>(path: string, schema: Schema<T>, init?: { method?: string; body?: unknown }): Promise<T> {
  const response = await send(path, init);
  if (!response.ok) throw new CompanyError(kindFromStatus(response.status));
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new CompanyError('server');
  return parsed.data;
}

export const listOrganizations = () => request('/organizations', OrganizationSchema.array());

export const listObjects = (orgId: string, filters: CompanyFilters) =>
  request(`/organizations/${orgId}/objects${buildQuery(filters)}`, InventoryObjectSchema.array());

export const getSummary = (orgId: string) => request(`/organizations/${orgId}/summary`, OrganizationSummarySchema);

export const getObject = (id: string) => request(`/objects/${id}`, InventoryObjectSchema);

export const listEvents = (id: string) => request(`/objects/${id}/events`, ObjectEventSchema.array());

export const changeStatus = (id: string, status: ChangeStatusInput['status']) =>
  request(`/objects/${id}/status`, InventoryObjectSchema, { method: 'PATCH', body: { status } });

export const addEvent = (id: string, input: CreateEventInput) =>
  request(`/objects/${id}/events`, ObjectEventSchema, { method: 'POST', body: input });

/** Longest wait for the company when resolving a scan, so a weak signal never leaves the scanner hanging. */
export const LOOKUP_TIMEOUT_MS = 8000;

/** Asks whether a scanned id is a company object. Never throws: the result tells the scanner what to do. */
export async function lookupCompanyObject(id: string, timeoutMs = LOOKUP_TIMEOUT_MS): Promise<LookupOutcome> {
  if (!supabase) return 'missing';
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  if (!data.session) return 'missing'; // No company session: behave as before.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiUrl}/objects/${id}`, { headers: { Authorization: `Bearer ${data.session.access_token}`, Accept: 'application/json' }, signal: controller.signal });
    return lookupOutcome(response.status);
  } catch {
    return controller.signal.aborted ? 'timeout' : lookupOutcome(null);
  } finally {
    clearTimeout(timer);
  }
}

/** Uploads one photo as multipart (field «file»). The event must already exist. */
export async function uploadEventFile(eventId: string, file: { uri: string; name: string; type: string }) {
  const bearer = await token();
  const form = new FormData();
  // React Native accepts { uri, name, type } as a file part.
  form.append('file', file as unknown as Blob);
  let response: Response;
  try { response = await fetch(`${apiUrl}/events/${eventId}/files`, { method: 'POST', headers: { Authorization: `Bearer ${bearer}`, Accept: 'application/json' }, body: form }); }
  catch { throw new CompanyError('offline'); }
  if (!response.ok) throw new CompanyError(kindFromStatus(response.status));
  const parsed = EventFileSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new CompanyError('server');
  return parsed.data;
}

const urlSchema = { safeParse: (v: unknown) => typeof (v as { url?: unknown } | null)?.url === 'string' ? { success: true as const, data: (v as { url: string }).url } : { success: false as const } };

/** Signed URL of an attachment; it expires after about 5 minutes. */
export const fileUrl = (fileId: string) => request<string>(`/files/${fileId}/url`, urlSchema);
