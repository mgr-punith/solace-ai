import {
  conversationPageSchema,
  conversationResponseSchema,
  messagePageSchema,
  sendResponseSchema,
  type SendMessageInput,
} from '@solace/shared';
import { createHttpClient } from '../../lib/api';
const http = createHttpClient(process.env.EXPO_PUBLIC_API_URL);
const path = (id: string) => `/v1/conversations/${encodeURIComponent(id)}`;
export const chatApi = {
  async list(token: string, cursor?: string) {
    return http.parse(
      conversationPageSchema,
      await http.request(
        `/v1/conversations?limit=15${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
        'GET',
        undefined,
        token,
      ),
    );
  },
  async create(token: string, requestId: string) {
    return http.parse(
      conversationResponseSchema,
      await http.request('/v1/conversations', 'POST', { requestId }, token),
    ).conversation;
  },
  async messages(token: string, id: string, cursor?: string) {
    return http.parse(
      messagePageSchema,
      await http.request(
        `${path(id)}/messages?limit=30${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
        'GET',
        undefined,
        token,
      ),
    );
  },
  async send(token: string, id: string, input: SendMessageInput) {
    return http.parse(
      sendResponseSchema,
      await http.request(`${path(id)}/messages`, 'POST', input, token),
    );
  },
  async remove(token: string, id: string) {
    await http.request(path(id), 'DELETE', undefined, token);
  },
};
