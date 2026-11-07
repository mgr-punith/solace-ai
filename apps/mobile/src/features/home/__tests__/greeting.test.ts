import { expect, it } from '@jest/globals';
import { firstName, homeGreeting } from '../greeting';

it('gives a calm overnight greeting and preserves intentionally mixed-case names', () => {
  expect(homeGreeting(1)).toBe('A quiet moment');
  expect(homeGreeting(8)).toBe('Good morning');
  expect(homeGreeting(14)).toBe('Good afternoon');
  expect(homeGreeting(20)).toBe('Good evening');
  expect(firstName('MAYA TEST')).toBe('Maya');
  expect(firstName('LeAnn Test')).toBe('LeAnn');
  expect(firstName('  ')).toBe('there');
});
