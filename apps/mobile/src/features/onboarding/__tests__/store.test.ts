import { expect, it } from '@jest/globals';
import { createOnboardingStore, type OnboardingStorage } from '../store';

function storage() {
  let value: string | null = null;
  let fail = false;
  const adapter: OnboardingStorage = {
    read: async () => value,
    write: async (next) => {
      if (fail) throw new Error('disk');
      value = next;
    },
  };
  return {
    adapter,
    fail: (next: boolean) => {
      fail = next;
    },
    corrupt: () => {
      value = '{broken';
    },
  };
}

it('starts with memory off, resumes progress, and never completes on a failed save', async () => {
  const disk = storage();
  const store = createOnboardingStore(disk.adapter);
  await store.restore();
  await store.bindUser(null);
  expect(store.getSnapshot().document).toMatchObject({
    step: 0,
    completed: false,
    pendingChoice: null,
  });
  await store.setStep(2);
  const resumed = createOnboardingStore(disk.adapter);
  await resumed.restore();
  await resumed.bindUser(null);
  expect(resumed.getSnapshot().document.step).toBe(2);
  disk.fail(true);
  expect(await resumed.complete(true)).toBe(false);
  expect(resumed.getSnapshot().document.completed).toBe(false);
  expect(resumed.getSnapshot().error).toBeTruthy();
  disk.fail(false);
  expect(await resumed.complete(false)).toBe(true);
  expect(resumed.getSnapshot().document.pendingChoice).toBe(false);
});

it('claims a pre-sign-in choice once and keeps other accounts opted out', async () => {
  const disk = storage();
  const store = createOnboardingStore(disk.adapter);
  await store.restore();
  await store.bindUser(null);
  await store.complete(true);
  await store.bindUser('user-a');
  expect(store.getSnapshot().document.choices['user-a']).toBe(true);
  expect(store.getSnapshot().document.pendingChoice).toBeNull();
  await store.bindUser(null);
  await store.bindUser('user-b');
  expect(store.getSnapshot().document.choices['user-b']).toBeUndefined();
  await store.complete(false);
  expect(store.getSnapshot().document.choices['user-a']).toBe(true);
  expect(store.getSnapshot().document.choices['user-b']).toBe(false);
  await store.removeAccount('user-a');
  expect(store.getSnapshot().document.choices['user-a']).toBeUndefined();
});

it('does not consume a pending choice when an account claim fails', async () => {
  const disk = storage();
  const store = createOnboardingStore(disk.adapter);
  await store.restore();
  await store.bindUser(null);
  await store.complete(true);
  disk.fail(true);
  expect(await store.bindUser('user-a')).toBe(false);
  expect(store.getSnapshot().document.pendingChoice).toBe(true);
  disk.fail(false);
  expect(await store.bindUser('user-a')).toBe(true);
  expect(store.getSnapshot().document.choices['user-a']).toBe(true);
});

it('treats corrupt local data as a fresh intro without granting consent', async () => {
  const disk = storage();
  disk.corrupt();
  const store = createOnboardingStore(disk.adapter);
  await store.restore();
  expect(store.getSnapshot().document.completed).toBe(false);
  expect(store.getSnapshot().document.pendingChoice).toBeNull();
  expect(store.getSnapshot().document.choices).toEqual({});
});
