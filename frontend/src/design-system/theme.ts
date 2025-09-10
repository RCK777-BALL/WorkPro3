import { MantineProvider, ColorSchemeProvider } from '@mantine/core';
import { useState } from 'react';
import type { ColorScheme } from '../modules/schema';
import { colors } from './tokens/colors';
import { spacing } from './tokens/spacing';
import { typography } from './tokens/typography';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');
  let toggleColorScheme = (value?: ColorScheme) =>
    setColorScheme(value || (colorScheme === 'dark' ? 'light' : 'dark'));

  const theme = {
    colorScheme,
    colors: { brand: colors[colorScheme].brand },
    primaryColor: 'brand',
    fontFamily: typography.fontFamily,
    fontSizes: typography.fontSizes,
    spacing,
  } as const;

  return (
    <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
      <MantineProvider withGlobalStyles withNormalizeCSS theme={theme}>
        {children}
      </MantineProvider>
    </ColorSchemeProvider>
  );
}
