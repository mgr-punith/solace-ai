import { z } from 'zod';

export const healthResponseSchema = z.object({ status: z.literal('ok') });
export const readyResponseSchema = z.object({
  status: z.literal('ok'),
  database: z.literal('connected'),
});
export const errorResponseSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ReadyResponse = z.infer<typeof readyResponseSchema>;

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().min(1),
  avatarUrl: z.url().nullable(),
});
export const googleSignInSchema = z.strictObject({ idToken: z.string().min(1).max(8_000) });
export const refreshRequestSchema = z.strictObject({ refreshToken: z.string().min(32).max(256) });
export const authResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string().min(1),
  refreshToken: z.string().min(32),
  accessTokenExpiresAt: z.iso.datetime(),
});
export const meResponseSchema = z.object({ user: userSchema });
export type User = z.infer<typeof userSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export * from './mood.ts';

export * from './chat.ts';
export * from './support.ts';
export * from './reminders.ts';
export * from './wellness.ts';
export * from './daily.ts';
