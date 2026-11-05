// Foundation subset of docs/design/DESIGN.md. Full design system: Phase 2.
export const tokens = {
  day: { background: '#EEF3F2', text: '#1F3A44', secondary: '#4B6670', error: '#B4536A' },
  night: { background: '#0F1A24', text: '#EAF3F2', secondary: '#B7CBD0', error: '#E59AAB' },
  action: { background: '#9CC9BF', text: '#12303A' },
  spacing: { sm: 8, md: 16, lg: 24, xl: 32 },
  typography: { title: 26, titleLine: 32, body: 17, bodyLine: 26 },
  radius: { pill: 999 },
  target: 48,
} as const;
