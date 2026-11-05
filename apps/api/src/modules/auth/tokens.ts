import { createHmac, randomBytes } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';

const claimsSchema = z.object({ sub: z.uuid(), sid: z.uuid() });
export function createTokens({
  accessSecret,
  refreshSecret,
  clock,
}: {
  accessSecret: string;
  refreshSecret: string;
  clock: () => Date;
}) {
  const key = new TextEncoder().encode(accessSecret);
  const hash = (token: string) => createHmac('sha256', refreshSecret).update(token).digest('hex');
  return {
    hash,
    refresh() {
      const token = randomBytes(32).toString('base64url');
      return {
        token,
        hash: hash(token),
        expiresAt: new Date(clock().getTime() + 30 * 24 * 60 * 60_000),
      };
    },
    async access(userId: string, sessionId: string) {
      const issued = Math.floor(clock().getTime() / 1000);
      const expires = issued + 15 * 60;
      const token = await new SignJWT({ sid: sessionId })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(userId)
        .setIssuer('solace-api')
        .setAudience('solace-mobile')
        .setIssuedAt(issued)
        .setExpirationTime(expires)
        .sign(key);
      return { token, expiresAt: new Date(expires * 1000).toISOString() };
    },
    async verify(token: string) {
      const { payload } = await jwtVerify(token, key, {
        algorithms: ['HS256'],
        issuer: 'solace-api',
        audience: 'solace-mobile',
        currentDate: clock(),
        requiredClaims: ['sub', 'sid', 'iat', 'exp'],
        typ: 'JWT',
      });
      const claims = claimsSchema.parse(payload);
      return { userId: claims.sub, sessionId: claims.sid };
    },
  };
}
export type Tokens = ReturnType<typeof createTokens>;
