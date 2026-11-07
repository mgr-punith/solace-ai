// Semantic values shared by the foundation screens and Phase 2 preview.
export const tokens = {
  day: { background: '#EEF3F2', text: '#1F3A44', secondary: '#4B6670', error: '#914359' },
  night: { background: '#0F1A24', text: '#EAF3F2', secondary: '#B7CBD0', error: '#E59AAB' },
  action: { background: '#9CC9BF', text: '#12303A' },
  spacing: { xs: 4, sm: 8, smd: 12, md: 16, ml: 20, lg: 24, xl: 32, xxl: 40, hero: 56 },
  typography: { title: 26, titleLine: 32, body: 17, bodyLine: 26 },
  radius: { pill: 999, surface: 24, input: 22, sheet: 32, tag: 12 },
  target: 48,
  icon: { sm: 18, md: 24, lg: 32, stroke: 1.8 },
  chart: { height: 140, width: 320 },
  colors: {
    seaGlass: '#9CC9BF',
    lantern: '#FFD58A',
    lanternClear: 'rgba(255,213,138,0)',
    rose: '#F2B6C1',
    face: '#1F3A44',
    clear: 'transparent',
  },
  surfaceOpacity: 0.94,
  border: 1,
  selectedBorder: 2,
  maxWidth: 480,
  moodChoiceWidth: 48,
  opacity: { pressed: 0.76, disabled: 0.45, blush: 0.35, glow: 0.26 },
  type: {
    display: { fontFamily: 'Fraunces_500Medium', fontSize: 34, lineHeight: 42 },
    title: { fontFamily: 'Fraunces_500Medium', fontSize: 26, lineHeight: 34 },
    heading: { fontFamily: 'Figtree_600SemiBold', fontSize: 20, lineHeight: 28 },
    body: { fontFamily: 'Figtree_400Regular', fontSize: 17, lineHeight: 26 },
    bodySmall: { fontFamily: 'Figtree_400Regular', fontSize: 15, lineHeight: 22 },
    caption: { fontFamily: 'Figtree_500Medium', fontSize: 13, lineHeight: 18 },
    button: { fontFamily: 'Figtree_600SemiBold', fontSize: 17, lineHeight: 22 },
  },
  motion: {
    startup: 700,
    press: 120,
    quick: 220,
    calm: 420,
    slow: 700,
    idle: 3000,
    float: 3500,
    blink: 140,
    breath: 4000,
    orbit: 6000,
  },
  sol: { hero: 220, onboarding: 160, compact: 56, mini: 28 },
} as const;

export const COMPANION_NAME = 'Sol';
export const moods = [
  { label: 'Heavy', color: '#7C8FB8', response: 'You can take this moment at your own pace.' },
  { label: 'Low', color: '#8FB3C4', response: 'There’s room here for how you feel.' },
  { label: 'Okay', color: '#9CC9BF', response: 'A little pause, just for you.' },
  { label: 'Good', color: '#E3D58F', response: 'Take a moment to notice what feels good.' },
  { label: 'Glowing', color: '#FFC76B', response: 'You can enjoy this feeling for a moment.' },
] as const;

export const skyFrames = [
  { minute: 0, top: '#17283A', bottom: '#0E1A26' },
  { minute: 330, top: '#3B4A63', bottom: '#C9A3A8' },
  { minute: 450, top: '#F3D6D2', bottom: '#CFE6E1' },
  { minute: 660, top: '#D3EAEE', bottom: '#F1F6F0' },
  { minute: 960, top: '#D9ECEA', bottom: '#F3E3DA' },
  { minute: 1110, top: '#EBBFC6', bottom: '#8C9DB8' },
  { minute: 1230, top: '#2B3550', bottom: '#141F2D' },
  { minute: 1440, top: '#17283A', bottom: '#0E1A26' },
] as const;
