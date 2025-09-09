import React, { ReactNode } from "react";
import {
  MantineProvider,
  ColorSchemeScript,
  createTheme,
  type MantineColorsTuple,
  type MantineColorScheme,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";

// --- define your brand palette (10 shades) ---
const brand: MantineColorsTuple = [
  "#eef2ff", "#e0e7ff", "#c7d2fe", "#a5b4fc", "#818cf8",
  "#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#312e81",
];

const theme = createTheme({
  primaryColor: "brand",
  colors: { brand },
  fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
  fontSizes: { xs: "12px", sm: "14px", md: "16px", lg: "18px", xl: "20px" },
  radius: { md: "12px", xl: "16px" },
  defaultRadius: "md",
});

type Props = { children: ReactNode };

export default function ThemeProvider({ children }: Props) {
  // v7 uses data attributes + hook, not <ColorSchemeProvider/>
  const [colorScheme] = useLocalStorage<MantineColorScheme>({
    key: "color-scheme",
    defaultValue: "light",
  });

  return (
    <>
      {/* put this once in your root layout (or index.html) */}
      <ColorSchemeScript defaultColorScheme={colorScheme} />
      <MantineProvider theme={theme} defaultColorScheme={colorScheme}>
        {children}
      </MantineProvider>
    </>
  );
}
