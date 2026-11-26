import type { CurrentUser } from '../domain/current-user';

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');
export const USER_DIRECTORY = Symbol('USER_DIRECTORY');

/** Verifies an access token and returns its user; throws when invalid. */
export interface TokenVerifier {
  verify(token: string): Promise<CurrentUser>;
}

export interface UserDirectory {
  /** Makes an authenticated user known (no-op for Postgres, where a trigger fills profiles). */
  remember(user: CurrentUser): Promise<void>;
  findByEmail(email: string): Promise<CurrentUser | null>;
  findByIds(ids: string[]): Promise<CurrentUser[]>;
}
