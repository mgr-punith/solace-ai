import { useEffect } from 'react';
import {
  Canvas,
  Circle,
  Group,
  Oval,
  Path,
  RadialGradient,
  interpolateColors,
  vec,
} from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { moods, tokens } from '../../theme/tokens';
import type { SolProps } from './types';

// Artwork coordinates use a 220-unit view box; layout dimensions use theme tokens.
const body =
  'M 110 30 C 154 27 191 59 190 109 C 192 153 156 189 110 190 C 67 192 29 158 30 111 C 28 65 62 31 110 30 Z';
const moodColors = moods.map((mood) => mood.color);
const moodRange = moods.map((_, index) => index);

export default function SolDrawing({
  state,
  mood,
  active,
  reduceMotion,
  greeting,
  reaction,
  pressed = false,
  size = tokens.sol.hero,
}: SolProps) {
  const scale = useSharedValue(1);
  const float = useSharedValue(0);
  const blink = useSharedValue(1);
  const orbit = useSharedValue(0);
  const tint = useSharedValue(mood);
  const touch = useSharedValue(0);
  const wave = useSharedValue(0);
  const { motion, colors } = tokens;

  useEffect(() => {
    touch.value = withTiming(active && pressed && !reduceMotion ? 1 : 0, {
      duration: reduceMotion ? 0 : pressed ? motion.press : motion.calm,
    });
    return () => cancelAnimation(touch);
  }, [pressed, active, reduceMotion, touch, motion]);

  useEffect(() => {
    cancelAnimation(wave);
    wave.value = 0;
    if (active && !reduceMotion && reaction === 'wave') {
      wave.value = withSequence(
        withTiming(-0.35, { duration: motion.quick }),
        withRepeat(withTiming(0.25, { duration: motion.quick }), 5, true),
        withTiming(0, { duration: motion.calm }),
      );
    }
    return () => cancelAnimation(wave);
  }, [reaction, greeting, active, reduceMotion, wave, motion]);

  useEffect(() => {
    tint.value = withTiming(mood, { duration: reduceMotion ? 0 : motion.slow });
    return () => cancelAnimation(tint);
  }, [mood, reduceMotion, tint, motion.slow]);

  useEffect(() => {
    [scale, float, blink, orbit].forEach(cancelAnimation);
    scale.value = 1;
    float.value = 0;
    blink.value = 1;
    orbit.value = 0;
    if (!active || reduceMotion) return;
    const calm = { duration: motion.idle, easing: Easing.inOut(Easing.sin) };
    if (state === 'breathing') {
      scale.value = 0.72;
      scale.value = withRepeat(
        withTiming(1, { duration: motion.breath, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      scale.value = withRepeat(withTiming(1.03, calm), -1, true);
      float.value = withRepeat(withTiming(-4, { ...calm, duration: motion.float }), -1, true);
      blink.value = withRepeat(
        withSequence(
          withDelay(4200, withTiming(0.12, { duration: motion.blink / 2 })),
          withTiming(1, { duration: motion.blink / 2 }),
        ),
        -1,
      );
      if (state === 'greeting' || greeting > 0) {
        scale.value = withSequence(
          withTiming(0.94, { duration: motion.press }),
          withTiming(1.04, { duration: motion.quick }),
          withTiming(1, { duration: motion.calm }),
          withRepeat(withTiming(1.03, calm), -1, true),
        );
      }
      if (state === 'thinking')
        orbit.value = withRepeat(
          withTiming(Math.PI * 2, { duration: motion.orbit, easing: Easing.linear }),
          -1,
        );
    }
    return () => [scale, float, blink, orbit].forEach(cancelAnimation);
  }, [state, active, reduceMotion, greeting, scale, float, blink, orbit, motion]);

  const transform = useDerivedValue(() => [
    { translateY: float.value },
    { scale: scale.value },
    { scaleX: 1 + touch.value * 0.06 },
    { scaleY: 1 - touch.value * 0.09 },
  ]);
  const waving = useDerivedValue(() => [{ rotate: wave.value }]);
  const eyelids = useDerivedValue(() => [{ scaleY: blink.value }]);
  const rotation = useDerivedValue(() => [{ rotate: orbit.value }]);
  const gradient = useDerivedValue(() => [
    colors.lantern,
    interpolateColors(tint.value, moodRange, moodColors),
  ]);
  const caring = mood < 2;
  return (
    <Canvas style={{ width: size, height: size }} accessible={false}>
      <Group transform={[{ scale: size / 220 }]}>
        <Circle cx={110} cy={112} r={108} opacity={tokens.opacity.glow}>
          <RadialGradient
            c={vec(110, 112)}
            r={108}
            colors={[colors.lantern, colors.lanternClear]}
            positions={[0.1, 1]}
          />
        </Circle>
        <Group origin={vec(110, 110)} transform={transform}>
          <Path path={body}>
            <RadialGradient c={vec(91, 77)} r={142} colors={gradient} positions={[0.05, 1]} />
          </Path>
          <Oval
            x={61}
            y={121}
            width={24}
            height={13}
            color={colors.rose}
            opacity={tokens.opacity.blush}
          />
          <Oval
            x={136}
            y={121}
            width={24}
            height={13}
            color={colors.rose}
            opacity={tokens.opacity.blush}
          />
          {reaction === 'wave' && (
            <Group origin={vec(169, 117)} transform={waving}>
              <Path
                path="M 169 123 Q 204 119 199 90"
                style="stroke"
                strokeWidth={12}
                strokeCap="round"
                color={moodColors[mood] ?? colors.seaGlass}
              />
            </Group>
          )}
          {state === 'breathing' || reaction === 'delight' ? (
            <Path
              path={
                reaction === 'delight'
                  ? 'M 79 108 Q 87 96 95 108 M 125 108 Q 133 96 141 108'
                  : 'M 79 108 Q 87 117 95 108 M 125 108 Q 133 117 141 108'
              }
              style="stroke"
              strokeWidth={3}
              strokeCap="round"
              color={colors.face}
            />
          ) : (
            <Group origin={vec(110, 106)} transform={eyelids}>
              <Oval
                x={state === 'thinking' ? 85 : 81}
                y={state === 'thinking' ? 94 : 99}
                width={10}
                height={caring ? 12 : 16}
                color={colors.face}
              />
              {reaction === 'wink' ? (
                <Path
                  path="M 125 107 Q 133 113 141 105"
                  style="stroke"
                  strokeWidth={3}
                  strokeCap="round"
                  color={colors.face}
                />
              ) : (
                <Oval
                  x={state === 'thinking' ? 131 : 127}
                  y={state === 'thinking' ? 94 : 99}
                  width={10}
                  height={caring ? 12 : 16}
                  color={colors.face}
                />
              )}
            </Group>
          )}
          <Path
            path={
              reaction === 'delight'
                ? 'M 98 126 Q 110 148 122 126 Z'
                : caring
                  ? 'M 101 131 Q 110 133 119 131'
                  : 'M 99 127 Q 110 138 121 127'
            }
            color={colors.face}
            style={reaction === 'delight' ? 'fill' : 'stroke'}
            strokeWidth={2.8}
            strokeCap="round"
          />
        </Group>
        {state === 'thinking' && (
          <Group origin={vec(110, 110)} transform={rotation}>
            <Circle cx={110} cy={10} r={4} color={colors.lantern} />
            <Circle cx={202} cy={150} r={3} color={colors.lantern} opacity={0.7} />
            <Circle cx={20} cy={155} r={2.5} color={colors.lantern} opacity={0.5} />
          </Group>
        )}
      </Group>
    </Canvas>
  );
}
