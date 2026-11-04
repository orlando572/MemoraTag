import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';
import { getLocalName, getOnboardingDone, getThemeMode, setOnboardingDone, setThemeMode as saveThemeMode, type ThemeMode } from '../storage';

function applyTheme(mode: ThemeMode) {
  Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
}

type Profile = {
  loading: boolean; error: boolean; name: string | null; onboardingDone: boolean;
  reload: () => Promise<void>; setName: (name: string) => void; completeOnboarding: () => void;
  /** Light, dark, or follow the phone. Applied to the whole app, including system pickers. */
  themeMode: ThemeMode; setThemeMode: (mode: ThemeMode) => Promise<void>;
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
  const [themeMode, setMode] = useState<ThemeMode>('system');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const value = await getLocalName();
      // Applied before the splash screen hides, so the app never flashes in the wrong theme.
      const mode = value ? await getThemeMode().catch(() => 'system' as const) : 'system';
      applyTheme(mode); setMode(mode);
      setDone(!!value && await getOnboardingDone()); setName(value); setError(false);
    }
    catch { setError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const completeOnboarding = useCallback(() => { setDone(true); void setOnboardingDone().catch(() => {}); }, []);
  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    applyTheme(mode); setMode(mode);
    await saveThemeMode(mode);
  }, []);
  return <Context.Provider value={{ loading, error, name, onboardingDone, reload, setName, completeOnboarding, themeMode, setThemeMode }}>{children}</Context.Provider>;
}
