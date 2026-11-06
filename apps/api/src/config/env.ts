import { z } from 'zod';

export const databaseUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        ['postgres:', 'postgresql:'].includes(url.protocol) &&
        ['require', 'verify-full', 'verify-ca'].includes(url.searchParams.get('sslmode') ?? '')
      );
    } catch {
      return false;
    }
  }, 'Use a PostgreSQL URL with TLS enabled');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    HOST: z.string().min(1).default('0.0.0.0'),
    LOG_LEVEL: z
      .enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .default('info'),
    DATABASE_URL: databaseUrlSchema,
    LLM_PROVIDER: z.literal('vyceai'),
    LLM_BASE_URL: z.url().refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
      );
    }),
    LLM_API_KEY: z.string().trim().min(1),
    LLM_MODEL: z.string().trim().min(1).max(200),
    GOOGLE_WEB_CLIENT_ID: z.string().regex(/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    TRUST_PROXY: z.coerce.number().int().min(0).max(1).default(0),
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.string().url())),
  })
  .refine((value) => value.JWT_ACCESS_SECRET !== value.JWT_REFRESH_SECRET, {
    message: 'Access and refresh secrets must differ',
    path: ['JWT_REFRESH_SECRET'],
  });

export function parseEnv(source: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    // Report field names only: validation inputs may contain credentials.
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path[0]))];
    throw new Error(
      `Invalid environment configuration: ${fields.join(', ')}. Check apps/api/.env.`,
    );
  }
  return parsed.data;
}

export type Env = ReturnType<typeof parseEnv>;
