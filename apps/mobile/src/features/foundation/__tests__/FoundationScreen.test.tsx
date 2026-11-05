import { expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FoundationScreen } from '../FoundationScreen';
import { checkConnection } from '../api';

jest.mock('../api', () => ({ checkConnection: jest.fn() }));
const check = jest.mocked(checkConnection);

it('shows a recoverable error and succeeds when the user retries', async () => {
  check
    .mockRejectedValueOnce(new Error('Cannot reach Solace. Try again.'))
    .mockResolvedValueOnce({ status: 'ok', database: 'connected' });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await render(
    <QueryClientProvider client={client}>
      <FoundationScreen />
    </QueryClientProvider>,
  );
  expect(screen.getByText('Check the connection when you’re ready.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Check connection' }));
  expect(await screen.findByText('Cannot reach Solace. Try again.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Try connection again' }));
  expect(await screen.findByText('Connected. Solace is ready.')).toBeTruthy();
  client.clear();
});
