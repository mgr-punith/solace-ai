import { skyFrames, tokens } from './tokens';

export type Appearance = 'auto' | 'day' | 'night';
export type Palette = { background: string; text: string; secondary: string; error: string };
export type Sky = {
  top: string;
  bottom: string;
  night: boolean;
  palette: Palette;
  surface: string;
};

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as [
    number,
    number,
    number,
  ];
}

export function mixColors(from: string, to: string, amount: number): string {
  const end = channels(to);
  return `#${channels(from)
    .map((value, index) =>
      Math.round(value + ((end[index] ?? value) - value) * amount)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

export function contrastRatio(first: string, second: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = channels(hex).map((value) => {
      const s = value / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return (r ?? 0) * 0.2126 + (g ?? 0) * 0.7152 + (b ?? 0) * 0.0722;
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function skyAtMinute(input: number, appearance: Appearance = 'auto'): Sky {
  const minute =
    appearance === 'day' ? 720 : appearance === 'night' ? 1380 : ((input % 1440) + 1440) % 1440;
  const nextIndex = skyFrames.findIndex((frame) => frame.minute > minute);
  const start = skyFrames[Math.max(0, nextIndex - 1)] ?? skyFrames[0];
  const end = skyFrames[nextIndex] ?? skyFrames[1];
  const amount = (minute - start.minute) / (end.minute - start.minute);
  const night = minute < 390 || minute >= 1170;
  const palette = night ? tokens.night : tokens.day;
  return {
    top: mixColors(start.top, end.top, amount),
    bottom: mixColors(start.bottom, end.bottom, amount),
    night,
    palette,
    surface: `rgba(${channels(palette.background).join(',')},${tokens.surfaceOpacity})`,
  };
}

export function surfaceAt(sky: Sky, position: number): string {
  return mixColors(
    mixColors(sky.top, sky.bottom, position),
    sky.palette.background,
    tokens.surfaceOpacity,
  );
}
