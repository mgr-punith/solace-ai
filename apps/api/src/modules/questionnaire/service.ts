import {
  answersMatchDay,
  dailyQuestions,
  DAILY_QUESTION_POINTS,
  localDay,
  QUESTIONNAIRE_VERSION,
  questionnaireCompletionSchema,
  questionnaireSaveSchema,
  questionnaireStatusSchema,
  type QuestionnaireInput,
} from '@solace/shared';
import { ApiError } from '../auth/errors.js';
import type { QuestionnaireRepository } from './repository.js';

type Row = NonNullable<Awaited<ReturnType<QuestionnaireRepository['completion']>>>;
const present = (row: Row) =>
  questionnaireCompletionSchema.parse({ ...row, completedAt: row.completedAt.toISOString() });
export function createQuestionnaireService({
  repository,
  clock,
}: {
  repository: QuestionnaireRepository;
  clock: () => Date;
}) {
  return {
    async today(userId: string, timezone: string) {
      const day = localDay(clock(), timezone);
      const [completion, totalPoints] = await Promise.all([
        repository.completion(userId, day),
        repository.total(userId),
      ]);
      return questionnaireStatusSchema.parse({
        day,
        timezone,
        version: QUESTIONNAIRE_VERSION,
        pointsAvailable: DAILY_QUESTION_POINTS,
        totalPoints,
        questions: dailyQuestions(day),
        completion: completion ? present(completion) : null,
      });
    },
    async save(userId: string, day: string, input: QuestionnaireInput) {
      if (!answersMatchDay(day, input.answers))
        throw new ApiError(
          400,
          'QUESTIONNAIRE_ANSWERS_INVALID',
          'Choose one answer for each of these four questions.',
        );
      const now = clock();
      // Look up an accepted day before checking midnight; a lost response must not lose its award.
      const existing = await repository.completion(userId, day);
      if (existing)
        return {
          created: false,
          result: questionnaireSaveSchema.parse({
            completion: present(existing),
            totalPoints: await repository.total(userId),
          }),
        };
      if (day !== localDay(now, input.timezone))
        throw new ApiError(
          409,
          'QUESTIONNAIRE_DAY_CHANGED',
          'A new day has started. Open today’s four questions to earn today’s points.',
        );
      const saved = await repository.create(
        userId,
        { day, timezone: input.timezone, version: input.version, points: DAILY_QUESTION_POINTS },
        now,
      );
      return {
        created: saved.created,
        result: questionnaireSaveSchema.parse({
          completion: present(saved.row),
          totalPoints: saved.totalPoints,
        }),
      };
    },
  };
}
export type QuestionnaireService = ReturnType<typeof createQuestionnaireService>;
