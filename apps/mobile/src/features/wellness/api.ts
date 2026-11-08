import {
  activityResponseSchema,
  dailyWellnessSchema,
  favoritesSchema,
  progressSchema,
  type ActivityInput,
} from '@solace/shared';
import { createHttpClient } from '../../lib/api';
const http = createHttpClient(process.env.EXPO_PUBLIC_API_URL);
export const wellnessApi = {
  async daily(token: string, timezone: string) {
    return http.parse(
      dailyWellnessSchema,
      await http.request(
        `/v1/wellness/today?timezone=${encodeURIComponent(timezone)}`,
        'GET',
        undefined,
        token,
      ),
    );
  },
  async save(token: string, input: ActivityInput) {
    return http.parse(
      activityResponseSchema,
      await http.request('/v1/activities', 'POST', input, token),
    ).activity;
  },
  async progress(token: string, timezone: string) {
    return http.parse(
      progressSchema,
      await http.request(
        `/v1/progress?timezone=${encodeURIComponent(timezone)}`,
        'GET',
        undefined,
        token,
      ),
    );
  },
  async favorites(token: string) {
    return http.parse(
      favoritesSchema,
      await http.request('/v1/affirmation-favorites', 'GET', undefined, token),
    );
  },
  async favorite(token: string, id: string, saved: boolean) {
    await http.request(
      `/v1/affirmation-favorites/${encodeURIComponent(id)}`,
      saved ? 'PUT' : 'DELETE',
      undefined,
      token,
    );
  },
};
