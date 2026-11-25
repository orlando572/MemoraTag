import 'server-only';
import type { Organization, Role } from '@memoratag/contracts';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { ApiError } from '@/lib/api';
import { serverApi } from '@/lib/api-server';
import { createClient } from '@/lib/supabase/server';

export type AppContext =
  | { ok: true; userId: string; email: string; organization: Organization | null; role: Role }
  | { ok: false; message: string };

// One lookup per request, shared by the layout and the pages.
export const getAppContext = cache(async (): Promise<AppContext> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  try {
    const api = await serverApi();
    const organizations = await api.organizations.list();
    // No multi-company selector yet: use the first organization.
    const organization = organizations[0] ?? null;
    return { ok: true, userId: data.user.id, email: data.user.email ?? '', organization, role: organization?.role ?? 'member' };
  } catch (error) {
    return { ok: false, message: error instanceof ApiError ? error.message : 'No se pudo cargar tu empresa.' };
  }
});
