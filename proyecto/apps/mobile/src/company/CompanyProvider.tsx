import type { Organization } from '@memoratag/contracts';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { listOrganizations } from './api';
import { toCompanyError } from './errors';
import { companyConfigured, supabase } from './supabase';

type State = 'loading' | 'signedOut' | 'signedIn';
type Company = {
  configured: boolean;
  state: State;
  email: string | null;
  /** First organization of the user; cached so the entry still shows (and says «sin conexión») offline. */
  org: Organization | null;
  /** True while the organization is being fetched after sign-in. */
  orgLoading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  reloadOrg: () => Promise<void>;
};

const orgKey = 'memoratag.company.org';
const Context = createContext<Company | null>(null);

async function readCachedOrg(): Promise<Organization | null> {
  try { const raw = await SecureStore.getItemAsync(orgKey); return raw ? JSON.parse(raw) as Organization : null; } catch { return null; }
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(companyConfigured ? 'loading' : 'signedOut');
  const [email, setEmail] = useState<string | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);

  const reloadOrg = useCallback(async () => {
    setOrgLoading(true);
    try {
      const first = (await listOrganizations())[0] ?? null;
      setOrg(first);
      if (first) await SecureStore.setItemAsync(orgKey, JSON.stringify(first)).catch(() => {});
      else await SecureStore.deleteItemAsync(orgKey).catch(() => {});
    } catch (error) {
      // Offline or server trouble: keep the cached organization. A rejected session signs the user out.
      if (toCompanyError(error).kind === 'auth') { await supabase?.auth.signOut().catch(() => {}); }
    } finally { setOrgLoading(false); }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void (async () => {
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (!alive) return;
      setEmail(data.session?.user.email ?? null);
      if (data.session) { setOrg(await readCachedOrg()); setState('signedIn'); void reloadOrg(); }
      else setState('signedOut');
    })();
    // Skip INITIAL_SESSION (handled above); only react to real changes.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      setEmail(session?.user.email ?? null);
      if (!session) { setOrg(null); setState('signedOut'); }
      else if (event === 'SIGNED_IN') setState('signedIn');
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [reloadOrg]);

  const signIn = useCallback(async (address: string, password: string) => {
    if (!supabase) return 'La cuenta de empresa no está disponible en esta versión.';
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: address.trim(), password });
      if (error) return error.status === 400 || error.code === 'invalid_credentials' ? 'Correo o contraseña incorrectos.' : error.status === 0 || error.name === 'AuthRetryableFetchError' ? 'Necesitas conexión para iniciar sesión.' : 'No se pudo iniciar sesión. Inténtalo más tarde.';
      setState('signedIn');
      await reloadOrg();
      return null;
    } catch { return 'Necesitas conexión para iniciar sesión.'; }
  }, [reloadOrg]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut().catch(() => {});
    await SecureStore.deleteItemAsync(orgKey).catch(() => {});
    setOrg(null); setEmail(null); setState('signedOut');
  }, []);

  const value = useMemo(() => ({ configured: companyConfigured, state, email, org, orgLoading, signIn, signOut, reloadOrg }), [state, email, org, orgLoading, signIn, signOut, reloadOrg]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCompany() {
  const value = useContext(Context);
  if (!value) throw new Error('CompanyProvider missing');
  return value;
}
