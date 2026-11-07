import {
  activitySchema,
  affirmations,
  localDay,
  summarizeProgress,
  type ActivityInput,
} from '@solace/shared';
import { ApiError } from '../auth/errors.js';
import type { WellnessRepository } from './repository.js';
export function createWellnessService({
  repository,
  clock,
}: {
  repository: WellnessRepository;
  clock: () => Date;
}) {
  return {
    async create(userId: string, input: ActivityInput) {
      const result = await repository.create(userId, input, clock());
      if (!result.matches)
        throw new ApiError(
          409,
          'ACTIVITY_CONFLICT',
          'This save was already used for a different activity.',
        );
      return {
        activity: activitySchema.parse({
          ...result.row,
          completedAt: result.row.completedAt.toISOString(),
        }),
        created: result.created,
      };
    },
    async progress(userId: string, timezone: string) {
      const now = clock();
      return summarizeProgress(
        await repository.dailyTotals(userId, timezone, now),
        localDay(now, timezone),
        timezone,
      );
    },
    async favorites(userId: string) {
      const rows = await repository.favorites(userId);
      return {
        items: rows.flatMap((row) => affirmations.filter((item) => item.id === row.affirmationId)),
      };
    },
    favorite: (userId: string, id: string) => repository.favorite(userId, id, clock()),
    unfavorite: (userId: string, id: string) => repository.unfavorite(userId, id),
  };
}
export type WellnessService = ReturnType<typeof createWellnessService>;
