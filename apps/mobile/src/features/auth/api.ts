import { authResponseSchema, meResponseSchema, type AuthResponse, type User } from '@solace/shared';
import { createHttpClient } from '../../lib/api';
export { AuthApiError } from '../../lib/api';

export type AuthApi = {
  google: (idToken: string) => Promise<AuthResponse>;
  refresh: (refreshToken: string) => Promise<AuthResponse>;
  me: (accessToken: string) => Promise<User>;
  logout: (refreshToken: string) => Promise<void>;
  deleteAccount: (accessToken: string) => Promise<void>;
};
export function createAuthApi(baseUrl: string | undefined): AuthApi {
  const { request, parse } = createHttpClient(baseUrl);
  return {
    async google(idToken) {
      return parse(authResponseSchema, await request('/v1/auth/google', 'POST', { idToken }));
    },
    async refresh(refreshToken) {
      return parse(authResponseSchema, await request('/v1/auth/refresh', 'POST', { refreshToken }));
    },
    async me(accessToken) {
      return parse(meResponseSchema, await request('/v1/me', 'GET', undefined, accessToken)).user;
    },
    async logout(refreshToken) {
      await request('/v1/auth/logout', 'POST', { refreshToken });
    },
    async deleteAccount(accessToken) {
      await request('/v1/me', 'DELETE', undefined, accessToken);
    },
  };
}
