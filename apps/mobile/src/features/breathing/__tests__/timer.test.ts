import { expect, it } from '@jest/globals';
import {
  breathFrame,
  createPractice,
  advancePractice,
  pausePractice,
  resumePractice,
} from '../timer';
it('uses exact pattern boundaries, including fractional coherent breaths and both box holds', () => {
  expect(breathFrame('box', 3999).label).toBe('Breathe in');
  expect(breathFrame('box', 4000).label).toBe('Hold gently');
  expect(breathFrame('box', 8000).label).toBe('Breathe out');
  expect(breathFrame('box', 12000).label).toBe('Rest');
  expect(breathFrame('box', 16000).label).toBe('Breathe in');
  expect(breathFrame('coherent', 5500).label).toBe('Breathe out');
  expect(breathFrame('478', 11000).label).toBe('Breathe out');
});
it('excludes time paused, completes once, and resists backward clocks', () => {
  let state = createPractice(60, 1000);
  state = pausePractice(state, 11000);
  expect(state.elapsedMs).toBe(10000);
  state = advancePractice(state, 91000);
  expect(state.elapsedMs).toBe(10000);
  state = resumePractice(state, 91000);
  expect(advancePractice(state, 90000).elapsedMs).toBe(10000);
  state = advancePractice(state, 141000);
  expect(state.status).toBe('complete');
  expect(state.elapsedMs).toBe(60000);
  expect(advancePractice(state, 300000)).toEqual(state);
});
