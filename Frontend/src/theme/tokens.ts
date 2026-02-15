export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
} as const;

export const radii = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(2, 6, 23, 0.08)',
  md: '0 8px 16px rgba(2, 6, 23, 0.08)',
  lg: '0 16px 40px rgba(2, 6, 23, 0.12)',
} as const;

export const typography = {
  fontFamily: "'Sora', 'Segoe UI', 'Helvetica Neue', sans-serif",
  monoFamily: "'JetBrains Mono', 'Consolas', monospace",
  scale: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '20px',
    xl: '28px',
  },
  lineHeight: {
    compact: '1.2',
    default: '1.5',
  },
} as const;

export const palettes = {
  light: {
    primary: '#0D74C7',
    primaryStrong: '#0A5EA6',
    primarySoft: '#E6F2FC',
    secondary: '#2F9AE5',
    secondarySoft: '#EAF5FD',
    background: '#F4F6F9',
    surface: '#FFFFFF',
    surfaceElevated: '#FDFEFF',
    text: '#000000',
    textMuted: '#000000',
    border: '#D6DFEA',
    borderStrong: '#B8C7D9',
    focus: '#0C78D8',
  },
  dark: {
    primary: '#FF8A63',
    primaryStrong: '#D95D39',
    primarySoft: '#3A1F17',
    secondary: '#37C0BC',
    secondarySoft: '#133636',
    background: '#0F1420',
    surface: '#151C2B',
    surfaceElevated: '#1A2438',
    text: '#ECF1FB',
    textMuted: '#A8B3CA',
    border: '#2A3650',
    borderStrong: '#3A4B6A',
    focus: '#7DB0FF',
  },
} as const;

export type ThemeMode = keyof typeof palettes;

export const tokens = {
  spacing,
  radii,
  shadows,
  typography,
  palettes,
} as const;
