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
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
