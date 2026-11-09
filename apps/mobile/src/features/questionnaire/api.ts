import {
  questionnaireSaveSchema,
  questionnaireStatusSchema,
  type QuestionnaireInput,
} from '@solace/shared';
import { createHttpClient } from '../../lib/api';

const http = createHttpClient(process.env.EXPO_PUBLIC_API_URL);
export const questionnaireApi = {
  async today(token: string, timezone: string) {
    return http.parse(
      questionnaireStatusSchema,
      await http.request(
        `/v1/daily-questions?timezone=${encodeURIComponent(timezone)}`,
        'GET',
        undefined,
        token,
      ),
    );
  },
  async save(token: string, day: string, input: QuestionnaireInput) {
    return http.parse(
      questionnaireSaveSchema,
      await http.request(`/v1/daily-questions/${encodeURIComponent(day)}`, 'PUT', input, token),
    );
  },
};
