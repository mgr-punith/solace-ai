import { reminderResponseSchema, type ReminderSettings } from '@solace/shared';
import { createHttpClient } from '../../lib/api';
const http = createHttpClient(process.env.EXPO_PUBLIC_API_URL);
export const reminderApi = {
  get: async (token: string) =>
    http.parse(reminderResponseSchema, await http.request('/v1/reminders', 'GET', undefined, token))
      .settings,
  save: async (token: string, settings: ReminderSettings) =>
    http.parse(reminderResponseSchema, await http.request('/v1/reminders', 'PUT', settings, token))
      .settings,
};
