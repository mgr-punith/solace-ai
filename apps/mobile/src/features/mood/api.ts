import { moodPageSchema, moodResponseSchema, type MoodInput, type MoodQuery } from '@solace/shared';
import { createHttpClient } from '../../lib/api';
const http = createHttpClient(process.env.EXPO_PUBLIC_API_URL);
export const moodApi = {
  async list(token: string, query: Partial<MoodQuery>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query))
      if (value !== undefined) params.set(key, String(value));
    return http.parse(
      moodPageSchema,
      await http.request(`/v1/mood-checkins?${params.toString()}`, 'GET', undefined, token),
    );
  },
  async save(token: string, input: MoodInput) {
    return http.parse(
      moodResponseSchema,
      await http.request('/v1/mood-checkins', 'POST', input, token),
    ).checkin;
  },
  async remove(token: string, id: string) {
    await http.request(`/v1/mood-checkins/${encodeURIComponent(id)}`, 'DELETE', undefined, token);
  },
};
