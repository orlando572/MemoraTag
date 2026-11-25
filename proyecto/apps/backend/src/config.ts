export const CONFIG = Symbol('CONFIG');
export const PG_POOL = Symbol('PG_POOL');

export interface AppConfig {
  supabaseUrl: string;
  databaseUrl: string;
  persistence: 'memory' | 'postgres';
  port: number;
  corsOrigins: string[];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const persistence = env.PERSISTENCE === 'postgres' ? 'postgres' : 'memory';
  const config: AppConfig = {
    supabaseUrl: (env.SUPABASE_URL ?? '').replace(/\/$/, ''),
    databaseUrl: env.DATABASE_URL ?? '',
    persistence,
    port: Number(env.PORT ?? 3000),
    corsOrigins: (env.CORS_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  };
  if (persistence === 'postgres' && !config.databaseUrl) throw new Error('DATABASE_URL is required with PERSISTENCE=postgres');
  return config;
}
