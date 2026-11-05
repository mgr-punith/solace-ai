import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { checkConnection } from '../api';

describe('connection check', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  it('rejects missing and insecure configuration before sending a request', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    await expect(checkConnection(undefined)).rejects.toThrow('EXPO_PUBLIC_API_URL');
    await expect(checkConnection('http://example.com')).rejects.toThrow('HTTPS');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('requires the database readiness response, not merely an HTTP success', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) } as Response);
    await expect(checkConnection('https://example.com')).rejects.toThrow('unexpected response');
  });
  it('turns a network failure into an actionable message', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));
    await expect(checkConnection('https://example.com')).rejects.toThrow(
      'Check your connection and try again',
    );
  });
});
