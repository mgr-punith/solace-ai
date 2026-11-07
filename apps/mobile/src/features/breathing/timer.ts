import { breathingPatterns, type BreathingPattern } from '@solace/shared';
export type Practice = {
  status: 'running' | 'paused' | 'complete';
  elapsedMs: number;
  durationMs: number;
  sampledAt: number;
};
export function createPractice(seconds: number, now: number): Practice {
  return { status: 'running', elapsedMs: 0, durationMs: seconds * 1000, sampledAt: now };
}
export function advancePractice(state: Practice, now: number): Practice {
  if (state.status !== 'running') return state;
  const elapsedMs = Math.min(
    state.durationMs,
    state.elapsedMs + Math.max(0, now - state.sampledAt),
  );
  return {
    ...state,
    elapsedMs,
    sampledAt: Math.max(now, state.sampledAt),
    status: elapsedMs === state.durationMs ? 'complete' : 'running',
  };
}
export function pausePractice(state: Practice, now: number): Practice {
  const updated = advancePractice(state, now);
  return updated.status === 'complete' ? updated : { ...updated, status: 'paused' };
}
export function resumePractice(state: Practice, now: number): Practice {
  return state.status === 'paused' ? { ...state, status: 'running', sampledAt: now } : state;
}
export function breathFrame(pattern: BreathingPattern, elapsedMs: number) {
  const phases = breathingPatterns[pattern].phases;
  const cycleMs = phases.reduce<number>((sum, value) => sum + value, 0);
  let offset = Math.max(0, elapsedMs) % cycleMs;
  for (let index = 0; index < phases.length; index++) {
    const duration = phases[index]!;
    if (offset < duration) {
      const from = [0.72, 1, 1, 0.72][index]!;
      const to = [1, 1, 0.72, 0.72][index]!;
      return {
        key: `${Math.floor(elapsedMs / cycleMs)}-${index}`,
        label: ['Breathe in', 'Hold gently', 'Breathe out', 'Rest'][index]!,
        remainingMs: duration - offset,
        scale: from + ((to - from) * offset) / duration,
        targetScale: to,
      };
    }
    offset -= duration;
  }
  throw new Error('A breathing pattern needs a nonzero phase.');
}
