import type { AuthResponse } from '@solace/shared';
import type { AuthRepository } from './repository.js';
import type { Tokens } from './tokens.js';
import type { GoogleIdentity } from './google.js';
import { ApiError, unauthenticated } from './errors.js';

export function createAuthService({
  repository,
  tokens,
  verifyGoogle,
  clock,
}: {
  repository: AuthRepository;
  tokens: Tokens;
  verifyGoogle: (idToken: string) => Promise<GoogleIdentity>;
  clock: () => Date;
}) {
  async function response(
    session: { user: AuthResponse['user']; sessionId: string },
    refreshToken: string,
  ): Promise<AuthResponse> {
    const access = await tokens.access(session.user.id, session.sessionId);
    return {
      user: session.user,
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken,
    };
  }
  async function authenticate(accessToken: string) {
    let claims: Awaited<ReturnType<Tokens['verify']>>;
    try {
      claims = await tokens.verify(accessToken);
    } catch {
      throw unauthenticated();
    }
    const user = await repository.current(claims.userId, claims.sessionId);
    if (!user) throw unauthenticated();
    return user;
  }
  return {
    authenticate,
    async google(idToken: string) {
      let identity: GoogleIdentity;
      try {
        identity = await verifyGoogle(idToken);
      } catch {
        throw new ApiError(
          401,
          'GOOGLE_TOKEN_INVALID',
          'Google sign-in could not be verified. Try signing in again.',
        );
      }
      const refresh = tokens.refresh();
      const session = await repository.signIn(identity, refresh, clock());
      return response(session, refresh.token);
    },
    async refresh(refreshToken: string) {
      const next = tokens.refresh();
      const session = await repository.rotate(tokens.hash(refreshToken), next, clock());
      if (!session) throw unauthenticated();
      return response(session, next.token);
    },
    async logout(refreshToken: string) {
      await repository.logout(tokens.hash(refreshToken), clock());
    },
    async deleteAccount(userId: string) {
      await repository.deleteAccount(userId);
    },
  };
}
export type AuthService = ReturnType<typeof createAuthService>;
