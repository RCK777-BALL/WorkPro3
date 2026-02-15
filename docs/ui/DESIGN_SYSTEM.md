# WorkPro Design System

Date: 2026-02-15
Location: `frontend/src/theme/*`

## Token files
- `frontend/src/theme/tokens.ts`
  - spacing scale: 4/8/12/16/24/32
  - radii: sm/md/lg/xl/xxl
  - shadows: sm/md/lg
  - typography scale and font families
  - light/dark palette primitives
- `frontend/src/theme/theme.ts`
  - semantic theme object (`color.primary`, `color.surface`, `color.text`, etc.)
  - `resolveTheme(mode)`
  - `applyThemeCssVariables(theme)` to map semantic tokens into CSS vars
- `frontend/src/theme/charts.ts`
  - consistent categorical + sequential chart palettes
- `frontend/src/theme/status.ts`
  - status semantic colors and common status-to-badge mapping

## Semantic color contract
Use semantic variables/tokens instead of hard-coded colors in app components:
- `--wp-color-primary`
- `--wp-color-primary-strong`
- `--wp-color-secondary`
- `--wp-color-background`
- `--wp-color-surface`
- `--wp-color-surface-elevated`
- `--wp-color-text`
- `--wp-color-text-muted`
- `--wp-color-border`
- `--wp-color-border-strong`
- `--wp-color-focus`

## WorkPro brand accent
- Primary accent: `#D95D39` (burnt orange)
- Secondary accent: `#0E8A87` (industrial teal)

This avoids direct visual overlap with well-known CMMS defaults while staying enterprise-accessible.

## Light + Dark mode
- Both palettes are defined in `tokens.ts`
- Runtime semantic variables are applied through `applyThemeCssVariables`
- Existing theme context still controls base background/text while semantic vars standardize components

## Usage examples

Card surface:
```tsx
<section className="border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]" />
```

Text hierarchy:
```tsx
<h1 className="text-[var(--wp-color-text)]" />
<p className="text-[var(--wp-color-text-muted)]" />
```

Status pill:
```tsx
<StatusPill value="in_progress" />
```

Chart palette:
```ts
import { chartPalette } from '@/theme/charts';
const colors = chartPalette.categorical;
```

## Accessibility
- Token choices target readable contrast in both light/dark contexts
- Focus color token (`--wp-color-focus`) reserved for keyboard-visible focus states
