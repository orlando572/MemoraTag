// NEXT_PUBLIC_* must be referenced literally so Next can inline them in the browser bundle.
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3100').replace(/\/$/, ''),
};
