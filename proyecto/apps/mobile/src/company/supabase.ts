import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

// EXPO_PUBLIC_* must be referenced literally so Metro can inline them.
export const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** The company section is hidden entirely when the app has no backend configured. */
export const companyConfigured = !!(apiUrl && supabaseUrl && supabaseKey);

// Session tokens live in the Android Keystore through SecureStore.
const storage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = companyConfigured
  ? createClient(supabaseUrl, supabaseKey, { auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })
  : null;

// Refresh tokens only while the app is in the foreground.
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}
