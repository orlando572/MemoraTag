import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getLocalName, getOnboardingDone, setOnboardingDone } from '../storage';

type Profile = {
  loading: boolean; error: boolean; name: string | null; onboardingDone: boolean;
  reload: () => Promise<void>; setName: (name: string) => void; completeOnboarding: () => void;
};
const Context = createContext<Profile | null>(null);

export function useProfile() {
  const value = useContext(Context);
  if (!value) throw new Error('ProfileProvider is missing');
  return value;
}

/** Local profile (name and tutorial state). It is not an account. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [onboardingDone, setDone] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try { const value = await getLocalName(); setDone(!!value && await getOnboardingDone()); setName(value); setError(false); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const completeOnboarding = useCallback(() => { setDone(true); void setOnboardingDone().catch(() => {}); }, []);
  return <Context.Provider value={{ loading, error, name, onboardingDone, reload, setName, completeOnboarding }}>{children}</Context.Provider>;
}
