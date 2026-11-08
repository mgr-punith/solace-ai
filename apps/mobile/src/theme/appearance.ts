import type { Appearance } from './sky';

export type AppearanceStorage = {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
};
type State = {
  appearance: Appearance;
  status: 'loading' | 'ready' | 'error';
  busy: boolean;
  error: string | null;
};

export function createAppearanceStore(storage: AppearanceStorage) {
  let state: State = { appearance: 'auto', status: 'loading', busy: false, error: null };
  let retryChoice: Appearance | null = null;
  const listeners = new Set<() => void>();
  function update(changes: Partial<State>) {
    state = { ...state, ...changes };
    listeners.forEach((listener) => listener());
  }
  async function restore() {
    if (state.busy) return;
    update({ status: 'loading', busy: true, error: null });
    try {
      const saved = await storage.read();
      update({
        appearance: saved === 'day' || saved === 'night' ? saved : 'auto',
        status: 'ready',
      });
    } catch {
      update({ status: 'error', error: 'Your appearance choice couldn’t be loaded. Try again.' });
    } finally {
      update({ busy: false });
    }
  }
  async function select(appearance: Appearance) {
    if (state.busy || state.status !== 'ready') return;
    const previous = state.appearance;
    retryChoice = appearance;
    update({ appearance, busy: true, error: null });
    try {
      await storage.write(appearance);
      retryChoice = null;
    } catch {
      update({
        appearance: previous,
        error: 'Your appearance choice couldn’t be saved. Try again.',
      });
    } finally {
      update({ busy: false });
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    restore,
    select,
    retry: () => (retryChoice === null ? restore() : select(retryChoice)),
  };
}
