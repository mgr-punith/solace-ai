import { expect, it } from 'vitest';
import { isCrisis } from './crisis.js';

it.each([
  'I want to kill myself',
  'I am going to end my life tonight',
  'I wish I was dead',
  'I feel suicidal',
  "I don't want to live anymore",
  'I might hurt myself',
  'I took an overdose',
  'I have a plan to commit suicide',
  'My friend wants to kill herself',
  'I am not suicidal but I want to die',
  'I am in immediate danger',
  'I have thoughts of suicide',
  'I took too many pills',
  'I want to self-harm',
  'mujhe marna hai',
  'मैं मरना चाहता हूँ',
])('routes acute distress to immediate support: %s', (text) => expect(isCrisis(text)).toBe(true));
it.each([
  'I am not suicidal',
  'That deadline is killing me',
  'I could die laughing',
  'I am sad and lonely',
  'I want to end my subscription',
  'I hurt my knee yesterday',
  'A suicide prevention fundraiser helped our town',
  'I do not want to hurt myself',
])('avoids literal-match false alarms: %s', (text) => expect(isCrisis(text)).toBe(false));
