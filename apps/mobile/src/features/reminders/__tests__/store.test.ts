import { expect, it, jest } from '@jest/globals';
import { defaultReminders, type ReminderSettings } from '@solace/shared';
import { createReminderStore } from '../store';
import { createReminderScheduler } from '../scheduler';

const a = '550e8400-e29b-41d4-a716-446655440000';
const b = '550e8400-e29b-41d4-a716-446655440001';
function setup() {
  let document: string | null = null;
  const scheduled: string[] = [];
  const storage = {
    read: jest.fn(async () => document),
    write: jest.fn(async (value: string) => {
      document = value;
    }),
    clear: jest.fn(async () => {
      document = null;
    }),
  };
  const scheduler = createReminderScheduler({
    cancel: async () => {
      scheduled.length = 0;
    },
    permission: async () => 'granted',
    prepare: async () => {},
    schedule: async (item) => {
      scheduled.push(item.id);
    },
  });
  const create = () => createReminderStore({ storage, scheduler, timezone: () => 'Asia/Kolkata' });
  const api = {
    get: jest.fn<() => Promise<ReminderSettings>>().mockResolvedValue(defaultReminders()),
    save: jest.fn<(s: ReminderSettings) => Promise<ReminderSettings>>(async (s) => s),
  };
  return { store: create(), create, api, storage, scheduled };
}
it('keeps an offline edit on disk and retries it after restart before fetching older account settings', async () => {
  const { store, create, api, scheduled } = setup();
  await store.bindUser(a, api);
  api.save.mockRejectedValueOnce(new Error('offline'));
  const settings = defaultReminders();
  settings.reminders[0]!.enabled = true;
  expect(await store.save(settings)).toBe(true);
  expect(store.getSnapshot()).toMatchObject({ pending: true, status: 'ready', count: 7 });
  expect(scheduled).toHaveLength(7);
  const restarted = create();
  await restarted.bindUser(a, api);
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(api.save).toHaveBeenCalledTimes(2);
  expect(restarted.getSnapshot()).toMatchObject({
    pending: false,
    settings: { timezone: 'Asia/Kolkata' },
  });
  expect(scheduled).toHaveLength(7);
});
it('removes one account cache and schedule before opening another account', async () => {
  const { store, api, scheduled } = setup();
  await store.bindUser(a, api);
  const settings = defaultReminders();
  settings.reminders[4]!.enabled = true;
  settings.reminders[4]!.customText = 'Private for A';
  await store.save(settings);
  await store.bindUser(b, api);
  expect(store.getSnapshot().settings?.reminders[4]?.customText).toBe('');
  expect(scheduled).toHaveLength(0);
});
it('sign-out cancels immediately and late account responses cannot restore data or schedules', async () => {
  const { store, api, scheduled, storage } = setup();
  await store.bindUser(a, api);
  const settings = defaultReminders();
  settings.reminders[0]!.enabled = true;
  await store.save(settings);
  let resolve!: (value: ReminderSettings) => void;
  api.get.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const pending = store.refresh();
  // Wait until the fetch has actually started, avoiding a test of only an idle queue.
  while (!resolve) await Promise.resolve();
  await store.bindUser(null);
  expect(scheduled).toHaveLength(0);
  expect(await storage.read()).toBeNull();
  resolve(settings);
  await pending;
  expect(store.getSnapshot()).toMatchObject({ userId: null, settings: null, count: 0 });
  expect(scheduled).toHaveLength(0);
  expect(await storage.read()).toBeNull();
});
it('does not report a local write failure as a save or schedule unsaved changes', async () => {
  const { store, api, scheduled, storage } = setup();
  await store.bindUser(a, api);
  storage.write.mockRejectedValueOnce(new Error('disk full'));
  const settings = defaultReminders();
  settings.reminders[0]!.enabled = true;
  expect(await store.save(settings)).toBe(false);
  expect(store.getSnapshot().settings?.reminders[0]?.enabled).toBe(false);
  expect(store.getSnapshot().error).toContain('could not be saved on this phone');
  expect(scheduled).toHaveLength(0);
  expect(api.save).not.toHaveBeenCalled();
});
