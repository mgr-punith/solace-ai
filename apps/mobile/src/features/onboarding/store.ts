export type OnboardingStorage = {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
};
export type OnboardingDocument = {
  version: 1;
  step: number;
  completed: boolean;
  pendingChoice: boolean | null;
  choices: Record<string, boolean>;
};
type State = {
  status: 'loading' | 'ready' | 'error';
  busy: boolean;
  error: string | null;
  userId: string | null;
  identityReady: boolean;
  document: OnboardingDocument;
};
const initial = (): OnboardingDocument => ({
  version: 1,
  step: 0,
  completed: false,
  pendingChoice: null,
  choices: {},
});

function parse(raw: string | null): OnboardingDocument {
  if (!raw) return initial();
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== 'object' ||
      !value ||
      !('version' in value) ||
      value.version !== 1 ||
      !('step' in value) ||
      !Number.isInteger(value.step) ||
      typeof value.step !== 'number' ||
      value.step < 0 ||
      value.step > 3 ||
      !('completed' in value) ||
      typeof value.completed !== 'boolean' ||
      !('pendingChoice' in value) ||
      (value.pendingChoice !== null && typeof value.pendingChoice !== 'boolean') ||
      !('choices' in value) ||
      typeof value.choices !== 'object' ||
      !value.choices ||
      Array.isArray(value.choices) ||
      !Object.values(value.choices).every((choice) => typeof choice === 'boolean')
    )
      return initial();
    return {
      version: 1,
      step: value.step,
      completed: value.completed,
      pendingChoice: value.pendingChoice,
      choices: { ...value.choices } as Record<string, boolean>,
    };
  } catch {
    return initial();
  }
}

export function createOnboardingStore(storage: OnboardingStorage) {
  let state: State = {
    status: 'loading',
    busy: false,
    error: null,
    userId: null,
    identityReady: false,
    document: initial(),
  };
  let queue = Promise.resolve();
  const listeners = new Set<() => void>();
  const update = (changes: Partial<State>) => {
    state = { ...state, ...changes };
    listeners.forEach((listener) => listener());
  };
  function run(action: () => Promise<void>) {
    const result = queue.then(async () => {
      update({ busy: true, error: null });
      try {
        await action();
        return true;
      } catch {
        update({
          error: 'Your choice couldn’t be saved on this device. Please try again.',
          ...(state.status === 'loading' ? { status: 'error' as const } : {}),
        });
        return false;
      } finally {
        update({ busy: false });
      }
    });
    queue = result.then(() => {});
    return result;
  }
  async function save(document: OnboardingDocument) {
    await storage.write(JSON.stringify(document));
    update({ document });
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    restore: () =>
      run(async () => {
        update({ status: 'loading' });
        try {
          update({ document: parse(await storage.read()), status: 'ready' });
        } catch {
          update({
            status: 'error',
            error: 'Your saved introduction couldn’t be opened. Please try again.',
          });
        }
      }),
    setStep: (step: number) =>
      run(async () => {
        if (state.status !== 'ready' || !state.identityReady)
          throw new Error('Introduction not ready');
        if (!Number.isInteger(step) || step < 0 || step > 3) throw new Error('Invalid step');
        await save({ ...state.document, step });
      }),
    complete: (enabled: boolean) =>
      run(async () => {
        if (state.status !== 'ready' || !state.identityReady)
          throw new Error('Introduction not ready');
        const userId = state.userId;
        await save({
          ...state.document,
          step: 3,
          completed: true,
          pendingChoice: userId ? null : enabled,
          choices: userId
            ? { ...state.document.choices, [userId]: enabled }
            : state.document.choices,
        });
      }),
    bindUser: (userId: string | null) =>
      run(async () => {
        // Set the identity even if the claim fails so privacy can never show the previous user's choice.
        update({ userId, identityReady: false });
        if (state.status !== 'ready') throw new Error('Introduction not ready');
        if (userId && state.document.pendingChoice !== null) {
          const previous = state.document.choices[userId];
          await save({
            ...state.document,
            pendingChoice: null,
            choices: {
              ...state.document.choices,
              [userId]: previous ?? state.document.pendingChoice,
            },
          });
        }
        update({ identityReady: true });
      }),
    removeAccount: (userId: string) =>
      run(async () => {
        const choices = { ...state.document.choices };
        delete choices[userId];
        await save({ ...state.document, choices, pendingChoice: null });
      }),
  };
}
