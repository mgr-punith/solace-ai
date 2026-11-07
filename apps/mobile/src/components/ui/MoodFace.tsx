import Svg, { Circle, Path } from 'react-native-svg';
import { moods, tokens } from '../../theme/tokens';
export function MoodFace({ mood, size = tokens.moodFace }: { mood: number; size?: number }) {
  const mouths = [
    'M 13 27 Q 20 18 27 27',
    'M 14 26 Q 20 22 26 26',
    'M 14 25 L 26 25',
    'M 13 23 Q 20 30 27 23',
    'M 12 22 Q 20 34 28 22 Z',
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" aria-hidden={true}>
      <Circle cx={20} cy={20} r={19} fill={moods[mood]?.color ?? tokens.colors.seaGlass} />
      <Circle cx={13} cy={16} r={1.8} fill={tokens.colors.face} />
      <Circle cx={27} cy={16} r={1.8} fill={tokens.colors.face} />
      <Path
        d={mouths[mood] ?? mouths[2]!}
        fill={mood === 4 ? tokens.colors.face : 'none'}
        stroke={tokens.colors.face}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}
