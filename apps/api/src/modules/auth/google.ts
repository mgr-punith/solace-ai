import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { ApiError } from './errors.js';

export type GoogleIdentity = { sub: string; email: string; name: string; avatarUrl: string | null };
const identitySchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.email(),
  email_verified: z.literal(true),
  name: z.string().trim().min(1).max(200).optional(),
  picture: z.url().optional(),
});
type GoogleClient = Pick<OAuth2Client, 'verifyIdToken'>;
export function createGoogleVerifier(
  webClientId: string,
  client: GoogleClient = new OAuth2Client({
    transporterOptions: { timeout: 8_000, retry: false },
  }),
) {
  return async (idToken: string): Promise<GoogleIdentity> => {
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: webClientId });
      const profile = identitySchema.parse(ticket.getPayload());
      return {
        sub: profile.sub,
        email: profile.email,
        name: profile.name ?? 'Friend',
        avatarUrl: profile.picture ?? null,
      };
    } catch {
      throw new ApiError(
        401,
        'GOOGLE_TOKEN_INVALID',
        'Google sign-in could not be verified. Try signing in again.',
      );
    }
  };
}
