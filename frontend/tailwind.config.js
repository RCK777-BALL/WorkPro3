import colors from 'tailwindcss/colors';

const primaryPalette = {
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#c7d2fe',
  300: '#a5b4fc',
  400: '#818cf8',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
  800: '#3730a3',
  900: '#312e81',
  950: '#1e1b4b',
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        'card-foreground': 'hsl(var(--card-foreground))',
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        'popover-foreground': 'hsl(var(--popover-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        'accent-foreground': 'hsl(var(--accent-foreground))',
        destructive: {
          DEFAULT: colors.rose[600],
          foreground: '#fff',
        },
        'destructive-foreground': '#fff',
        primary: {
          ...primaryPalette,
          DEFAULT: primaryPalette[600],
          foreground: 'hsl(var(--primary-foreground))',
        },
        'primary-foreground': 'hsl(var(--primary-foreground))',
        'primary-dark': primaryPalette[700],
        'primary-light': primaryPalette[300],
        secondary: {
          ...colors.slate,
          DEFAULT: colors.slate[900],
          foreground: colors.slate[100],
        },
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        navy: {
          DEFAULT: '#001f3f',
          light: '#405173',
          dark: '#000a1a',
        },
        success: {
          ...colors.emerald,
          DEFAULT: colors.emerald[500],
        },
        warning: {
          ...colors.amber,
          DEFAULT: colors.amber[500],
        },
        error: {
          ...colors.rose,
          DEFAULT: colors.rose[600],
        },
        info: {
          ...colors.sky,
          DEFAULT: colors.sky[500],
        },
      },
      boxShadow: {
        navy: '0 4px 6px -1px rgba(0, 31, 63, 0.1), 0 2px 4px -2px rgba(0, 31, 63, 0.05)',
        'navy-md': '0 8px 12px -3px rgba(0, 31, 63, 0.2), 0 4px 6px -4px rgba(0, 31, 63, 0.1)',
        'navy-lg': '0 20px 25px -5px rgba(0, 31, 63, 0.25), 0 10px 10px -5px rgba(0, 31, 63, 0.1)',
      },
      blur: {
        xs: '2px',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
};
