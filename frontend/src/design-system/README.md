# Design System

Shared theme configuration, design tokens, and basic UI components built with [Mantine](https://mantine.dev).

## Theme

Wrap the application with the `ThemeProvider` to apply global styles and enable light/dark modes:

```tsx
import { ThemeProvider } from './design-system';

<ThemeProvider>
  <App />
</ThemeProvider>
```

## Tokens

- `tokens/colors.ts` – color palettes for light and dark schemes.
- `tokens/spacing.ts` – spacing scale.
- `tokens/typography.ts` – font families and sizes.

## Components

- `EmptyState` – placeholder shown when no data is available.
- `ErrorState` – displays an error message with an optional retry action.

Import components as needed:

```tsx
import { EmptyState, ErrorState } from './design-system';
```
