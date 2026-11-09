import { describe, expect, it } from '@jest/globals';
import { contrastRatio, mixColors, skyAtMinute, surfaceAt } from '../sky';
import { tokens } from '../tokens';

describe('the local-time sky', () => {
  it('wraps midnight and keeps the last minute close to the first', () => {
    expect(skyAtMinute(1440)).toEqual(skyAtMinute(0));
    expect(skyAtMinute(-1)).toEqual(skyAtMinute(1439));
    expect(skyAtMinute(1439).top).toBe(skyAtMinute(0).top);
  });

  it('uses the selected day/night appearance independently of the clock', () => {
    expect(skyAtMinute(0, 'day')).toEqual(skyAtMinute(720, 'day'));
    expect(skyAtMinute(720, 'night')).toEqual(skyAtMinute(0, 'night'));
    expect(skyAtMinute(720).night).toBe(false);
    expect(skyAtMinute(1380).night).toBe(true);
  });

  it('keeps primary, secondary and error text readable at every minute and sky position', () => {
    let minimum = Infinity;
    for (let minute = 0; minute < 1440; minute += 1) {
      const sky = skyAtMinute(minute);
      for (const position of [0, 0.25, 0.5, 0.75, 1]) {
        const background = surfaceAt(sky, position);
        for (const foreground of [sky.palette.text, sky.palette.secondary, sky.palette.error]) {
          minimum = Math.min(minimum, contrastRatio(foreground, background));
        }
      }
    }
    expect(minimum).toBeGreaterThanOrEqual(4.5);
  });

  it('measures standard contrast and interpolates valid endpoint colors', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
    expect(mixColors('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixColors('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('keeps message text and thinking status readable on both chat surfaces', () => {
    for (const [background, palette] of [
      [tokens.chat.solDay, tokens.day],
      [tokens.chat.solNight, tokens.night],
    ] as const) {
      for (const foreground of [palette.text, palette.secondary, palette.error])
        expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(tokens.action.text, tokens.action.background)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps card text readable in either appearance', () => {
    for (const appearance of ['day', 'night'] as const) {
      const sky = skyAtMinute(0, appearance);
      for (const foreground of [sky.palette.text, sky.palette.secondary, sky.palette.error])
        expect(contrastRatio(foreground, sky.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
