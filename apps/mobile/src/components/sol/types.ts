export type SolState = 'idle' | 'greeting' | 'thinking' | 'breathing';
export type SolProps = {
  state: SolState;
  mood: number;
  active: boolean;
  reduceMotion: boolean;
  greeting: number;
  size?: number;
};
