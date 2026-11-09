import { and, eq, sql } from 'drizzle-orm';
import type { createDatabase } from '../../db/client.js';
import { questionnaireCompletions } from '../../db/schema/index.js';

type Database = ReturnType<typeof createDatabase>['db'];
export function createQuestionnaireRepository(db: Database) {
  const ownedDay = (userId: string, day: string) =>
    and(eq(questionnaireCompletions.userId, userId), eq(questionnaireCompletions.day, day));
  async function completion(userId: string, day: string) {
    return (
      (await db.select().from(questionnaireCompletions).where(ownedDay(userId, day)).limit(1))[0] ??
      null
    );
  }
  async function total(userId: string) {
    const [row] = await db
      .select({ points: sql`coalesce(sum(${questionnaireCompletions.points}), 0)`.mapWith(Number) })
      .from(questionnaireCompletions)
      .where(eq(questionnaireCompletions.userId, userId));
    return row!.points;
  }
  return {
    completion,
    total,
    async create(
      userId: string,
      value: { day: string; timezone: string; version: string; points: number },
      now: Date,
    ) {
      return db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(questionnaireCompletions)
          .values({
            userId,
            ...value,
            completedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing({
            target: [questionnaireCompletions.userId, questionnaireCompletions.day],
          })
          .returning();
        const row =
          inserted ??
          (
            await tx
              .select()
              .from(questionnaireCompletions)
              .where(ownedDay(userId, value.day))
              .limit(1)
          )[0]!;
        const [sum] = await tx
          .select({
            points: sql`coalesce(sum(${questionnaireCompletions.points}), 0)`.mapWith(Number),
          })
          .from(questionnaireCompletions)
          .where(eq(questionnaireCompletions.userId, userId));
        return { row, created: !!inserted, totalPoints: sum!.points };
      });
    },
  };
}
export type QuestionnaireRepository = ReturnType<typeof createQuestionnaireRepository>;
