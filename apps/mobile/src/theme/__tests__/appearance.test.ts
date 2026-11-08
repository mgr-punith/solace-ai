import { expect, it, jest } from '@jest/globals';
import { createAppearanceStore, type AppearanceStorage } from '../appearance';

function storage(initial: string | null = null): AppearanceStorage {
  let saved = initial;
  return {
    read: jest.fn(async () => saved),
    write: jest.fn(async (value: string) => {
      saved = value;
    }),
  };
}

it('restores a saved appearance on a new app instance', async () => {
  const disk = storage();
  const first = createAppearanceStore(disk);
  await first.restore();
  await first.select('night');
  const reopened = createAppearanceStore(disk);
  await reopened.restore();
  expect(reopened.getSnapshot()).toMatchObject({ appearance: 'night', status: 'ready' });
});

it('applies immediately, blocks overlapping writes and rolls back a failed save for retry', async () => {
  const disk = storage('day');
  let rejectWrite: (error: Error) => void = () => {};
  jest.mocked(disk.write).mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectWrite = reject;
      }),
  );
  const store = createAppearanceStore(disk);
  await store.restore();
  const writing = store.select('night');
  expect(store.getSnapshot()).toMatchObject({ appearance: 'night', busy: true });
  await store.select('auto');
  expect(disk.write).toHaveBeenCalledTimes(1);
  rejectWrite(new Error('disk unavailable'));
  await writing;
  expect(store.getSnapshot()).toMatchObject({ appearance: 'day', busy: false });
  expect(store.getSnapshot().error).toBeTruthy();
  await store.retry();
  expect(store.getSnapshot()).toMatchObject({ appearance: 'night', error: null });
});

it('keeps a failed read separate from an empty preference and restores it on retry', async () => {
  const disk = storage('night');
  jest.mocked(disk.read).mockRejectedValueOnce(new Error('locked'));
  const store = createAppearanceStore(disk);
  await store.restore();
  expect(store.getSnapshot()).toMatchObject({ status: 'error', appearance: 'auto' });
  await store.select('day');
  expect(disk.write).not.toHaveBeenCalled();
  await store.retry();
  expect(store.getSnapshot()).toMatchObject({ status: 'ready', appearance: 'night' });
});

it.each([null, 'unknown', '{broken', '"night"'])(
  'uses Auto for an absent or invalid saved value: %s',
  async (value) => {
    const disk = storage(value);
    const store = createAppearanceStore(disk);
    await store.restore();
    expect(store.getSnapshot()).toMatchObject({ status: 'ready', appearance: 'auto' });
    expect(disk.write).not.toHaveBeenCalled();
  },
);
