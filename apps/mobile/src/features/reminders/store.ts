import { z } from 'zod';
import { reminderSettingsSchema, type ReminderSettings } from '@solace/shared';
import type { createReminderScheduler, Permission } from './scheduler';

const cacheSchema = z.object({
  userId: z.uuid(),
  settings: reminderSettingsSchema,
  pending: z.boolean(),
});
type Remote = {
  get(): Promise<ReminderSettings>;
  save(settings: ReminderSettings): Promise<ReminderSettings>;
};
type State = {
  userId: string | null;
  settings: ReminderSettings | null;
  status: 'loading' | 'ready' | 'error';
  busy: boolean;
  pending: boolean;
  error: string | null;
  scheduleError: string | null;
  permission: Permission;
  count: number;
};
export function createReminderStore({
  storage,
  scheduler,
  timezone,
}: {
  storage: {
    read(): Promise<string | null>;
    write(value: string): Promise<void>;
    clear(): Promise<void>;
  };
  scheduler: ReturnType<typeof createReminderScheduler>;
  timezone: () => string;
}) {
  let state: State = {
    userId: null,
    settings: null,
    status: 'loading',
    busy: false,
    pending: false,
    error: null,
    scheduleError: null,
    permission: 'undetermined',
    count: 0,
  };
  let generation = 0;
  let remote: Remote | null = null;
  let operations = Promise.resolve();
  let disk = Promise.resolve();
  const listeners = new Set<() => void>();
  const update = (changes: Partial<State>) => {
    state = { ...state, ...changes };
    listeners.forEach((l) => l());
  };
  const current = (version: number) => version === generation;
  function onDisk<T>(action: () => Promise<T>) {
    const result = disk.then(action);
    disk = result.then(
      () => {},
      () => {},
    );
    return result;
  }
  async function persist(version: number, settings: ReminderSettings, pending: boolean) {
    await onDisk(async () => {
      if (current(version) && state.userId)
        await storage.write(JSON.stringify({ userId: state.userId, settings, pending }));
    });
  }
  async function schedule(version: number, settings: ReminderSettings) {
    if (!current(version)) return;
    try {
      const result = await scheduler.reconcile(settings);
      if (current(version))
        update({ permission: result.permission, count: result.count, scheduleError: null });
    } catch {
      if (current(version))
        update({ count: 0, scheduleError: 'Your reminders could not be scheduled. Try again.' });
    }
  }
  function run(version: number, operation: () => Promise<void>) {
    const result = operations.then(async () => {
      if (!current(version)) return;
      update({ busy: true, error: null });
      try {
        await operation();
      } catch {
        if (current(version))
          update({
            status: state.settings ? 'ready' : 'error',
            error: state.settings
              ? 'Your phone has your preferences. Account sync could not finish; try again when connected.'
              : 'Your reminder preferences could not be opened. Check your connection and try again.',
          });
      } finally {
        if (current(version)) update({ busy: false });
      }
    });
    operations = result.catch(() => {});
    return result;
  }
  async function sync(version: number, api: Remote) {
    if (!current(version)) return;
    const settings = state.settings;
    const received = state.pending && settings ? await api.save(settings) : await api.get();
    if (!current(version)) return;
    const local = { ...received, timezone: timezone() };
    // Time-of-day follows this device after travel; do not rewrite another device's timezone on reads.
    await persist(version, local, false);
    if (!current(version)) return;
    update({ settings: local, status: 'ready', pending: false });
    await schedule(version, local);
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    bindUser(userId: string | null, api: Remote | null = null) {
      const version = ++generation;
      remote = api;
      update({
        userId,
        settings: null,
        status: userId ? 'loading' : 'ready',
        busy: !!userId,
        pending: false,
        error: null,
        scheduleError: null,
        count: 0,
      });
      // Cleanup must never wait for a network request queued behind auth logout.
      const cleanup = scheduler.clear();
      if (!userId) return Promise.all([cleanup, onDisk(() => storage.clear())]).then(() => {});
      return run(version, async () => {
        await cleanup;
        const raw = await onDisk(() => storage.read());
        if (!current(version)) return;
        let cached: z.infer<typeof cacheSchema> | null = null;
        try {
          cached = raw ? cacheSchema.parse(JSON.parse(raw)) : null;
        } catch {
          /* Corrupt cache is replaced by the account copy. */
        }
        if (cached?.userId === userId) {
          const settings = { ...cached.settings, timezone: timezone() };
          update({ settings, pending: cached.pending, status: 'ready' });
          await schedule(version, settings);
        } else {
          await onDisk(() => (current(version) ? storage.clear() : Promise.resolve()));
        }
        if (api) await sync(version, api);
      });
    },
    refresh() {
      const version = generation,
        api = remote;
      if (!state.userId || !api || state.busy) return Promise.resolve();
      return run(version, async () => {
        if (state.settings) await schedule(version, { ...state.settings, timezone: timezone() });
        await sync(version, api);
      });
    },
    save(input: ReminderSettings) {
      const version = generation,
        api = remote;
      if (!state.userId || !api || state.busy) return Promise.resolve(false);
      let saved = false;
      return run(version, async () => {
        const settings = reminderSettingsSchema.parse({ ...input, timezone: timezone() });
        try {
          await persist(version, settings, true);
        } catch {
          if (current(version))
            update({ error: 'Your preferences could not be saved on this phone. Try again.' });
          return;
        }
        if (!current(version)) return;
        saved = true;
        update({ settings, status: 'ready', pending: true });
        await schedule(version, settings);
        await sync(version, api);
      }).then(() => saved);
    },
  };
}
