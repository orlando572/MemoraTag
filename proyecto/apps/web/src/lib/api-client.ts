'use client';

import { createApi } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

// API client for Client Components: reads the access token from the browser session.
export function browserApi() {
  const supabase = createClient();
  return createApi(async () => (await supabase.auth.getSession()).data.session?.access_token ?? null);
}
