import { and, desc, eq, sql } from 'drizzle-orm';
import type { MoodInput } from '@solace/shared';
import type { createDatabase } from '../../db/client.js';
import { moodCheckins, profiles } from '../../db/schema/index.js';

type Database = ReturnType<typeof createDatabase>['db'];
export type MoodCursor = { createdAt: string; id: string };
export function createMoodRepository(db: Database) {
  return {
    async create(userId: string, input: MoodInput, now: Date) {
      return db.transaction(async (tx) => {
        const inserted = await tx
          .insert(moodCheckins)
          .values({ ...input, userId, createdAt: now, updatedAt: now })
          .onConflictDoNothing({ target: [moodCheckins.userId, moodCheckins.requestId] })
          .returning();
        const row =
          inserted[0] ??
          (
            await tx
              .select()
              .from(moodCheckins)
              .where(
                and(eq(moodCheckins.userId, userId), eq(moodCheckins.requestId, input.requestId)),
              )
          )[0]!;
        if (inserted[0])
          await tx
            .insert(profiles)
            .values({ userId, timezone: input.timezone, createdAt: now, updatedAt: now })
            .onConflictDoUpdate({
              target: profiles.userId,
              set: { timezone: input.timezone, updatedAt: now },
            });
        return { row, created: !!inserted[0] };
      });
    },
    async list(
      userId: string,
      limit: number,
      cursor: MoodCursor | null,
      today?: { day: string; timezone: string },
    ) {
      // The timezone parameter is validated in the contract; date boundaries are PostgreSQL's IANA rules.
      return db
        .select()
        .from(moodCheckins)
        .where(
          and(
            eq(moodCheckins.userId, userId),
            cursor
              ? sql`(${moodCheckins.createdAt}, ${moodCheckins.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
              : undefined,
            today
              ? sql`${moodCheckins.createdAt} >= (${today.day}::date::timestamp AT TIME ZONE ${today.timezone}) AND ${moodCheckins.createdAt} < ((${today.day}::date + 1)::timestamp AT TIME ZONE ${today.timezone})`
              : undefined,
          ),
        )
        .orderBy(desc(moodCheckins.createdAt), desc(moodCheckins.id))
        .limit(limit + 1);
    },
    async get(userId: string, id: string) {
      return (
        (
          await db
            .select()
            .from(moodCheckins)
            .where(and(eq(moodCheckins.userId, userId), eq(moodCheckins.id, id)))
        )[0] ?? null
      );
    },
    async remove(userId: string, id: string) {
      return (
        (
          await db
            .delete(moodCheckins)
            .where(and(eq(moodCheckins.userId, userId), eq(moodCheckins.id, id)))
            .returning({ id: moodCheckins.id })
        ).length > 0
      );
    },
  };
}
export type MoodRepository = ReturnType<typeof createMoodRepository>;
