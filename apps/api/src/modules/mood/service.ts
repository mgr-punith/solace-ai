import { z } from 'zod';
import {
  localDay,
  moodCheckinSchema,
  type MoodInput,
  type MoodQuery,
  type MoodPage,
} from '@solace/shared';
import { ApiError } from '../auth/errors.js';
import type { MoodRepository, MoodCursor } from './repository.js';
const cursorSchema = z.object({ id: z.uuid(), createdAt: z.iso.datetime() });
const missing = () =>
  new ApiError(404, 'CHECKIN_NOT_FOUND', 'This check-in is no longer available.');
function serialize(row: NonNullable<Awaited<ReturnType<MoodRepository['get']>>>) {
  return moodCheckinSchema.parse({ ...row, createdAt: row.createdAt.toISOString() });
}
export function createMoodService({
  repository,
  clock,
}: {
  repository: MoodRepository;
  clock: () => Date;
}) {
  return {
    async create(userId: string, input: MoodInput) {
      const result = await repository.create(userId, input, clock());
      if (
        !result.created &&
        (result.row.mood !== input.mood ||
          result.row.note !== input.note ||
          result.row.timezone !== input.timezone ||
          JSON.stringify(result.row.tags) !== JSON.stringify(input.tags))
      )
        throw new ApiError(
          409,
          'CHECKIN_CONFLICT',
          'This save was already used. Start a new check-in.',
        );
      return { checkin: serialize(result.row), created: result.created };
    },
    async list(userId: string, query: MoodQuery): Promise<MoodPage> {
      let cursor: MoodCursor | null = null;
      if (query.cursor) {
        try {
          cursor = cursorSchema.parse(
            JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')),
          );
        } catch {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'The check-in page is invalid. Refresh and try again.',
          );
        }
      }
      const rows = await repository.list(
        userId,
        query.limit,
        cursor,
        query.period === 'today'
          ? { day: localDay(clock(), query.timezone), timezone: query.timezone }
          : undefined,
      );
      const items = rows.slice(0, query.limit).map(serialize);
      const last = items.at(-1);
      return {
        items,
        nextCursor:
          rows.length > query.limit && last
            ? Buffer.from(JSON.stringify({ id: last.id, createdAt: last.createdAt })).toString(
                'base64url',
              )
            : null,
      };
    },
    async get(userId: string, id: string) {
      const row = await repository.get(userId, id);
      if (!row) throw missing();
      return serialize(row);
    },
    async remove(userId: string, id: string) {
      if (!(await repository.remove(userId, id))) throw missing();
    },
  };
}
export type MoodService = ReturnType<typeof createMoodService>;
