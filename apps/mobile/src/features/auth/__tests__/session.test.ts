import { describe, expect, it, jest } from '@jest/globals';
import type { AuthResponse } from '@solace/shared';
import { AuthApiError, type AuthApi } from '../api';
import { createSessionManager } from '../session';

const session: AuthResponse = {
  user: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Maya',
    email: 'maya@example.invalid',
    avatarUrl: null,
  },
  accessToken: 'access',
  refreshToken: 'refresh'.repeat(8),
  accessTokenExpiresAt: '2026-11-05T12:15:00.000Z',
};
function setup(stored: AuthResponse | null = null, now = Date.parse('2026-11-05T12:00:00Z')) {
  const api: AuthApi = {
    google: jest.fn<AuthApi['google']>().mockResolvedValue(session),
    refresh: jest.fn<AuthApi['refresh']>().mockResolvedValue({
      ...session,
      accessToken: 'new-access',
      refreshToken: 'new-refresh'.repeat(8),
      accessTokenExpiresAt: '2026-11-05T12:45:00.000Z',
    }),
    me: jest.fn<AuthApi['me']>().mockResolvedValue(session.user),
    logout: jest.fn<AuthApi['logout']>().mockResolvedValue(undefined),
    deleteAccount: jest.fn<AuthApi['deleteAccount']>().mockResolvedValue(undefined),
  };
  const storage = {
    read: jest.fn<() => Promise<AuthResponse | null>>().mockResolvedValue(stored),
    write: jest.fn<(value: AuthResponse) => Promise<void>>().mockResolvedValue(undefined),
    clear: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
  const google = {
    signIn: jest.fn<() => Promise<string | null>>().mockResolvedValue('google-id-token'),
    signOut: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
  return {
    api,
    storage,
    google,
    manager: createSessionManager({ api, storage, google, now: () => now }),
  };
}
describe('secure session lifecycle', () => {
  it('does not authenticate a first launch and saves a Google session before showing signed-in content', async () => {
    const { manager, api, storage } = setup();
    await manager.restore();
    expect(manager.getSnapshot().status).toBe('signedOut');
    expect(api.me).not.toHaveBeenCalled();
    await manager.signIn();
    expect(api.google).toHaveBeenCalledWith('google-id-token');
    expect(storage.write).toHaveBeenCalledWith(session);
    expect(manager.getSnapshot().status).toBe('signedIn');
  });
  it('treats Google cancellation as a normal signed-out state', async () => {
    const { manager, google, api } = setup();
    google.signIn.mockResolvedValue(null);
    await manager.signIn();
    expect(manager.getSnapshot()).toMatchObject({
      status: 'signedOut',
      error: null,
      session: null,
    });
    expect(api.google).not.toHaveBeenCalled();
  });
  it('refreshes an expired stored session and persists rotation before making protected requests', async () => {
    const { manager, api, storage } = setup(session, Date.parse('2026-11-05T12:20:00Z'));
    await manager.restore();
    expect(api.refresh).toHaveBeenCalledWith(session.refreshToken);
    expect(storage.write).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'new-access' }),
    );
    expect(api.me).toHaveBeenCalledWith('new-access');
    expect(manager.getSnapshot().status).toBe('signedIn');
  });
  it('serializes session operations so overlapping restores do not replay refresh tokens', async () => {
    const { manager, api, storage } = setup(session, Date.parse('2026-11-05T12:20:00Z'));
    storage.read.mockImplementation(async () => storage.write.mock.calls.at(-1)?.[0] ?? session);
    await Promise.all([manager.restore(), manager.restore()]);
    expect(api.refresh).toHaveBeenCalledTimes(1);
  });
  it('preserves stored tokens during an offline startup and offers a recoverable retry', async () => {
    const { manager, api, storage } = setup(session);
    jest.mocked(api.me).mockRejectedValueOnce(new Error('Check your connection and try again.'));
    await manager.restore();
    expect(manager.getSnapshot()).toMatchObject({ status: 'error', session });
    expect(storage.clear).not.toHaveBeenCalled();
    await manager.restore();
    expect(manager.getSnapshot().status).toBe('signedIn');
  });
  it('clears an invalid refresh session and never exposes the authenticated screen', async () => {
    const { manager, api, storage } = setup(session, Date.parse('2026-11-05T12:20:00Z'));
    jest.mocked(api.refresh).mockRejectedValue(new AuthApiError(401, 'SESSION_EXPIRED', 'Expired'));
    await manager.restore();
    expect(storage.clear).toHaveBeenCalled();
    expect(manager.getSnapshot()).toMatchObject({ status: 'signedOut', session: null });
  });
  it('does not report successful logout or deletion when the server is unreachable', async () => {
    const { manager, api, storage } = setup(session);
    await manager.restore();
    jest.mocked(api.logout).mockRejectedValueOnce(new Error('Offline'));
    await manager.logout();
    expect(manager.getSnapshot()).toMatchObject({ status: 'signedIn', error: 'Offline' });
    expect(storage.clear).not.toHaveBeenCalled();
    await manager.logout();
    expect(manager.getSnapshot().status).toBe('signedOut');
  });
  it('clears local credentials only after the account deletion succeeds', async () => {
    const { manager, api, storage } = setup(session);
    await manager.restore();
    await manager.deleteAccount();
    expect(api.deleteAccount).toHaveBeenCalledWith(session.accessToken);
    expect(storage.clear).toHaveBeenCalled();
    expect(manager.getSnapshot()).toMatchObject({ status: 'signedOut', session: null });
  });
  it('revokes a newly issued session when secure storage cannot persist it', async () => {
    const { manager, api, storage } = setup();
    storage.write.mockRejectedValue(new Error('Native storage failed'));
    await manager.signIn();
    expect(api.logout).toHaveBeenCalledWith(session.refreshToken);
    expect(storage.clear).toHaveBeenCalled();
    expect(manager.getSnapshot()).toMatchObject({ status: 'signedOut', session: null });
  });
});
