import 'server-only';
import { createApi } from '@/lib/api';
import { createClient } from '@/lib/supabase/server';

// API client for Server Components and actions: reads the access token from the cookie session.
export async function serverApi() {
  const supabase = await createClient();
  return createApi(async () => (await supabase.auth.getSession()).data.session?.access_token ?? null);
}
