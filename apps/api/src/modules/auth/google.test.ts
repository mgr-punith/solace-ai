import { describe, expect, it, vi } from 'vitest';
import { LoginTicket } from 'google-auth-library';
import { createGoogleVerifier } from './google.js';

const webClientId = '123456789-test.apps.googleusercontent.com';
const payload = {
  iss: 'accounts.google.com',
  aud: webClientId,
  sub: 'google-subject',
  email: 'test@example.invalid',
  email_verified: true,
  name: 'Test person',
  iat: 1,
  exp: 2,
};
describe('Google token verifier boundary', () => {
  it('passes the intended audience to the official verifier and uses only verified profile data', async () => {
    const verifyIdToken = vi.fn().mockResolvedValue(new LoginTicket('', payload));
    const verify = createGoogleVerifier(webClientId, { verifyIdToken });
    expect(await verify('google-token')).toEqual({
      sub: 'google-subject',
      email: 'test@example.invalid',
      name: 'Test person',
      avatarUrl: null,
    });
    expect(verifyIdToken).toHaveBeenCalledWith({ idToken: 'google-token', audience: webClientId });
  });
  it('rejects unverified email and never reveals token or verifier details', async () => {
    const verifyIdToken = vi
      .fn()
      .mockResolvedValue(new LoginTicket('', { ...payload, email_verified: false }));
    const verify = createGoogleVerifier(webClientId, { verifyIdToken });
    await expect(verify('private-token')).rejects.toMatchObject({
      status: 401,
      code: 'GOOGLE_TOKEN_INVALID',
    });
    verifyIdToken.mockRejectedValue(new Error('private-token-and-network-details'));
    await expect(verify('private-token')).rejects.toThrow('could not be verified');
    await expect(verify('private-token')).rejects.not.toThrow('private-token-and-network-details');
  });
});
