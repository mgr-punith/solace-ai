import {
  authResponseSchema,
  errorResponseSchema,
  meResponseSchema,
  type AuthResponse,
  type User,
} from '@solace/shared';
import type { z } from 'zod';

export class AuthApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export type AuthApi = {
  google: (idToken: string) => Promise<AuthResponse>;
  refresh: (refreshToken: string) => Promise<AuthResponse>;
  me: (accessToken: string) => Promise<User>;
  logout: (refreshToken: string) => Promise<void>;
  deleteAccount: (accessToken: string) => Promise<void>;
};
export function createAuthApi(baseUrl: string | undefined): AuthApi {
  async function request(
    path: string,
    method: string,
    body?: unknown,
    accessToken?: string,
  ): Promise<unknown> {
    if (!baseUrl) throw new Error('The server address is missing. Check the app configuration.');
    let url: URL;
    try {
      url = new URL(path, baseUrl);
    } catch {
      throw new Error('The server address is invalid. Check the app configuration.');
    }
    if (url.protocol !== 'https:')
      throw new Error('Use an HTTPS server address to protect your connection.');
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(url.toString(), {
        method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (response.status === 204) return undefined;
      const data: unknown = await response.json();
      if (!response.ok) {
        const parsed = errorResponseSchema.safeParse(data);
        throw new AuthApiError(
          response.status,
          parsed.success ? parsed.data.error.code : 'REQUEST_FAILED',
          parsed.success ? parsed.data.error.message : 'The request failed. Try again shortly.',
        );
      }
      return data;
    } catch (error) {
      if (error instanceof AuthApiError) throw error;
      throw new Error('Cannot reach Solace right now. Check your connection and try again.');
    } finally {
      clearTimeout(deadline);
    }
  }
  function parse<T>(schema: z.ZodType<T>, data: unknown) {
    const parsed = schema.safeParse(data);
    if (!parsed.success)
      throw new Error('The server sent an unexpected response. Try again shortly.');
    return parsed.data;
  }
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
