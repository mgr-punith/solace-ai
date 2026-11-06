import { useQuery } from '@tanstack/react-query';
import { chatProviderResponseSchema } from '@solace/shared';
import { createHttpClient } from '../../lib/api';

const http = createHttpClient(process.env.EXPO_PUBLIC_API_URL);
export const providerInfoApi = {
  async get() {
    return http.parse(chatProviderResponseSchema, await http.request('/v1/chat-provider', 'GET'));
  },
};

export function useChatProvider() {
  return useQuery({
    queryKey: ['chat-provider'],
    queryFn: providerInfoApi.get,
    retry: false,
    staleTime: 0,
  });
}
