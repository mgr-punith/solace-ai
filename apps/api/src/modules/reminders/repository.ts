import { eq } from 'drizzle-orm';
import type { ReminderSettings } from '@solace/shared';
import type { createDatabase } from '../../db/client.js';
import { reminderPreferences } from '../../db/schema/index.js';

export function createReminderRepository(db: ReturnType<typeof createDatabase>['db']) {
  return {
    async get(userId: string) {
      return (
        (
          await db.select().from(reminderPreferences).where(eq(reminderPreferences.userId, userId))
        )[0]?.settings ?? null
      );
    },
    async save(userId: string, settings: ReminderSettings, now: Date) {
      const [row] = await db
        .insert(reminderPreferences)
        .values({ userId, settings, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: reminderPreferences.userId,
          set: { settings, updatedAt: now },
        })
        .returning();
      return row!.settings;
    },
  };
}
export type ReminderRepository = ReturnType<typeof createReminderRepository>;
