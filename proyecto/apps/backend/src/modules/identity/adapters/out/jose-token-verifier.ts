import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { CurrentUser } from '../../domain/current-user';
import type { TokenVerifier } from '../../application/ports';

/** Verifies Supabase Auth JWTs against the project's JWKS. */
export class JoseTokenVerifier implements TokenVerifier {
  private readonly jwks;
  private readonly issuer: string;

  constructor(supabaseUrl: string) {
    if (!supabaseUrl) throw new Error('SUPABASE_URL is required');
    this.issuer = `${supabaseUrl}/auth/v1`;
    this.jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  }

  async verify(token: string): Promise<CurrentUser> {
    const { payload } = await jwtVerify(token, this.jwks, { issuer: this.issuer, audience: 'authenticated' });
    if (!payload.sub) throw new Error('token without subject');
    return { id: payload.sub, email: String(payload.email ?? '').toLowerCase() };
  }
}
