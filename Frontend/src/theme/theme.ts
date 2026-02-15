import { palettes, radii, shadows, spacing, typography, type ThemeMode } from './tokens';

export type SemanticTheme = {
  mode: ThemeMode;
  color: {
    primary: string;
    primaryStrong: string;
    secondary: string;
    background: string;
    surface: string;
    surfaceElevated: string;
    text: string;
    textMuted: string;
    border: string;
    borderStrong: string;
    focus: string;
  };
  spacing: typeof spacing;
  radius: typeof radii;
  shadow: typeof shadows;
  typography: typeof typography;
};

export const lightTheme: SemanticTheme = {
  mode: 'light',
  color: {
    primary: palettes.light.primary,
    primaryStrong: palettes.light.primaryStrong,
    secondary: palettes.light.secondary,
    background: palettes.light.background,
    surface: palettes.light.surface,
    surfaceElevated: palettes.light.surfaceElevated,
    text: palettes.light.text,
    textMuted: palettes.light.textMuted,
    border: palettes.light.border,
    borderStrong: palettes.light.borderStrong,
    focus: palettes.light.focus,
  },
  spacing,
  radius: radii,
  shadow: shadows,
  typography,
};

export const darkTheme: SemanticTheme = {
  mode: 'dark',
  color: {
    primary: palettes.dark.primary,
    primaryStrong: palettes.dark.primaryStrong,
    secondary: palettes.dark.secondary,
    background: palettes.dark.background,
    surface: palettes.dark.surface,
    surfaceElevated: palettes.dark.surfaceElevated,
    text: palettes.dark.text,
    textMuted: palettes.dark.textMuted,
    border: palettes.dark.border,
    borderStrong: palettes.dark.borderStrong,
    focus: palettes.dark.focus,
  },
  spacing,
  radius: radii,
  shadow: shadows,
  typography,
};

export const resolveTheme = (mode: ThemeMode): SemanticTheme =>
  mode === 'dark' ? darkTheme : lightTheme;

export const applyThemeCssVariables = (theme: SemanticTheme) => {
  if (typeof window === 'undefined') return;
  const root = window.document.documentElement;
  root.style.setProperty('--wp-color-primary', theme.color.primary);
  root.style.setProperty('--wp-color-primary-strong', theme.color.primaryStrong);
  root.style.setProperty('--wp-color-secondary', theme.color.secondary);
  root.style.setProperty('--wp-color-background', theme.color.background);
  root.style.setProperty('--wp-color-surface', theme.color.surface);
  root.style.setProperty('--wp-color-surface-elevated', theme.color.surfaceElevated);
  root.style.setProperty('--wp-color-text', theme.color.text);
  root.style.setProperty('--wp-color-text-muted', theme.color.textMuted);
  root.style.setProperty('--wp-color-border', theme.color.border);
  root.style.setProperty('--wp-color-border-strong', theme.color.borderStrong);
  root.style.setProperty('--wp-color-focus', theme.color.focus);
  root.style.setProperty('--wp-radius-xxl', theme.radius.xxl);
};
