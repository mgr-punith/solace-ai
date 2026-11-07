import { and, desc, eq, sql } from 'drizzle-orm';
import type { ActivityInput, ProgressDay } from '@solace/shared';
import type { createDatabase } from '../../db/client.js';
import { activityLogs, affirmationFavorites, profiles } from '../../db/schema/index.js';
type Database = ReturnType<typeof createDatabase>['db'];
export function createWellnessRepository(db: Database) {
  return {
    async create(userId: string, input: ActivityInput, now: Date) {
      return db.transaction(async (tx) => {
        const values = {
          userId,
          requestId: input.requestId,
          type: input.type,
          timezone: input.timezone,
          pattern: input.type === 'breathing' ? input.pattern : null,
          durationSeconds: input.type === 'breathing' ? input.durationSeconds : 0,
          beforeMood: input.type === 'breathing' ? input.beforeMood : null,
          afterMood: input.type === 'breathing' ? input.afterMood : null,
          affirmationId: input.type === 'affirmation' ? input.affirmationId : null,
          completedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        const inserted = await tx
          .insert(activityLogs)
          .values(values)
          .onConflictDoNothing({ target: [activityLogs.userId, activityLogs.requestId] })
          .returning();
        const row =
          inserted[0] ??
          (
            await tx
              .select()
              .from(activityLogs)
              .where(
                and(eq(activityLogs.userId, userId), eq(activityLogs.requestId, input.requestId)),
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
        return {
          row,
          created: !!inserted[0],
          matches:
            row.type === values.type &&
            row.timezone === values.timezone &&
            row.pattern === values.pattern &&
            row.durationSeconds === values.durationSeconds &&
            row.affirmationId === values.affirmationId &&
            row.beforeMood === values.beforeMood &&
            row.afterMood === values.afterMood,
        };
      });
    },
    async dailyTotals(userId: string, timezone: string, now: Date): Promise<ProgressDay[]> {
      // Aggregate in PostgreSQL: never transfer private notes or unbounded raw events to the app.
      const result = await db.execute(sql`
        with actions as (
          select created_at as happened_at, mood::numeric as mood, 0 as seconds, 0 as sessions
          from mood_checkins where user_id = ${userId} and created_at <= ${now.toISOString()}::timestamptz
          union all
          select completed_at, null::numeric, duration_seconds, case when type = 'breathing' then 1 else 0 end
          from activity_logs where user_id = ${userId} and completed_at <= ${now.toISOString()}::timestamptz
        )
        select to_char(happened_at at time zone ${timezone}, 'YYYY-MM-DD') as day,
          avg(mood)::float8 as "moodAverage", count(*)::int as actions,
          sum(seconds)::int as "breathingSeconds", sum(sessions)::int as "breathingSessions"
        from actions group by day order by day desc
      `);
      return result.rows.map((row) => ({
        day: String(row.day),
        moodAverage: row.moodAverage === null ? null : Number(row.moodAverage),
        actions: Number(row.actions),
        breathingSeconds: Number(row.breathingSeconds),
        breathingSessions: Number(row.breathingSessions),
      }));
    },
    async favorites(userId: string) {
      return db
        .select({ affirmationId: affirmationFavorites.affirmationId })
        .from(affirmationFavorites)
        .where(eq(affirmationFavorites.userId, userId))
        .orderBy(desc(affirmationFavorites.createdAt), desc(affirmationFavorites.id));
    },
    async favorite(userId: string, affirmationId: string, now: Date) {
      await db
        .insert(affirmationFavorites)
        .values({ userId, affirmationId, createdAt: now, updatedAt: now })
        .onConflictDoNothing({
          target: [affirmationFavorites.userId, affirmationFavorites.affirmationId],
        });
    },
    async unfavorite(userId: string, affirmationId: string) {
      await db
        .delete(affirmationFavorites)
        .where(
          and(
            eq(affirmationFavorites.userId, userId),
            eq(affirmationFavorites.affirmationId, affirmationId),
          ),
        );
    },
  };
}
export type WellnessRepository = ReturnType<typeof createWellnessRepository>;
