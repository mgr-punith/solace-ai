import { defaultReminders, reminderSettingsSchema, type ReminderSettings } from '@solace/shared';
import type { ReminderRepository } from './repository.js';

export function createReminderService({
  repository,
  clock,
}: {
  repository: ReminderRepository;
  clock: () => Date;
}) {
  return {
    async get(userId: string) {
      return reminderSettingsSchema.parse((await repository.get(userId)) ?? defaultReminders());
    },
    async save(userId: string, settings: ReminderSettings) {
      return reminderSettingsSchema.parse(await repository.save(userId, settings, clock()));
    },
  };
}
export type ReminderService = ReturnType<typeof createReminderService>;
