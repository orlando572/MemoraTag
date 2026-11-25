import type { FileStorage } from '../../application/ports';

const BUCKET = 'event-files';

/** Supabase Storage (private bucket) through its REST API. The service key must stay in the backend. */
export class SupabaseFileStorage implements FileStorage {
  private readonly base: string;

  constructor(
    supabaseUrl: string,
    private readonly serviceKey: string,
  ) {
    if (!supabaseUrl || !serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for file storage');
    this.base = `${supabaseUrl}/storage/v1`;
  }

  private headers(extra: Record<string, string> = {}) {
    return { Authorization: `Bearer ${this.serviceKey}`, apikey: this.serviceKey, ...extra };
  }

  async put(path: string, bytes: Buffer, mime: string) {
    const res = await fetch(`${this.base}/object/${BUCKET}/${path}`, { method: 'POST', headers: this.headers({ 'Content-Type': mime, 'x-upsert': 'false' }), body: new Uint8Array(bytes) });
    if (!res.ok) throw new Error(`Storage upload failed (${res.status})`);
  }

  async signedUrl(path: string, seconds: number) {
    const res = await fetch(`${this.base}/object/sign/${BUCKET}/${path}`, { method: 'POST', headers: this.headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ expiresIn: seconds }) });
    if (!res.ok) throw new Error(`Storage signing failed (${res.status})`);
    const { signedURL } = (await res.json()) as { signedURL: string };
    return `${this.base}${signedURL}`;
  }

  async remove(path: string) {
    const res = await fetch(`${this.base}/object/${BUCKET}/${path}`, { method: 'DELETE', headers: this.headers() });
    if (!res.ok) throw new Error(`Storage removal failed (${res.status})`);
  }
}
