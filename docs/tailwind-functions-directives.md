# Tailwind Core Concepts: Functions and Directives

This reference covers the custom CSS directives and functions that Tailwind exposes for use in your project stylesheets.

## Directives

Tailwind provides a set of custom at-rules that enable special functionality within Tailwind CSS projects.

### `@import`

Inline import CSS files, including Tailwind itself:

```css
@import "tailwindcss";
```

### `@theme`

Define custom design tokens such as fonts, colors, breakpoints, and easing curves:

```css
@theme {
  --font-display: "Satoshi", "sans-serif";
  --breakpoint-3xl: 120rem;
  --color-avocado-100: oklch(0.99 0 0);
  --color-avocado-200: oklch(0.98 0.04 113.22);
  --color-avocado-300: oklch(0.94 0.11 115.03);
  --color-avocado-400: oklch(0.92 0.19 114.08);
  --color-avocado-500: oklch(0.84 0.18 117.33);
  --color-avocado-600: oklch(0.53 0.12 118.34);
  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
  /* ... */
}
```

### `@source`

Explicitly specify source files that Tailwind's automatic content detection should scan:

```css
@source "../node_modules/@my-company/ui-lib";
```

### `@utility`

Register custom utilities that work with Tailwind variants:

```css
@utility tab-4 {
  tab-size: 4;
}
```

### `@variant`

Apply a Tailwind variant within CSS rules:

```css
.my-element {
  background: white;
  @variant dark {
    background: black;
  }
}
```

### `@custom-variant`

Define custom variants available to utilities:

```css
@custom-variant theme-midnight (&:where([data-theme="midnight"] *));
```

This enables utilities like `theme-midnight:bg-black` and `theme-midnight:text-white`.

### `@apply`

Inline existing utility classes into custom CSS declarations:

```css
.select2-dropdown {
  @apply rounded-b-lg shadow-md;
}
.select2-search {
  @apply rounded border border-gray-300;
}
.select2-results__group {
  @apply text-lg font-bold text-gray-900;
}
```

This is useful for overriding third-party styles while staying aligned with your design tokens.

### `@reference`

Import your main stylesheet for reference when using `@apply` or `@variant` in component-scoped styles without duplicating CSS output:

```vue
<template>
  <h1>Hello world!</h1>
</template>
<style>
  @reference "../../app.css";
  h1 {
    @apply text-2xl font-bold text-red-500;
  }
</style>
```

If you are only using the default Tailwind theme, you can reference `tailwindcss` directly:

```vue
<template>
  <h1>Hello world!</h1>
</template>
<style>
  @reference "tailwindcss";
  h1 {
    @apply text-2xl font-bold text-red-500;
  }
</style>
```

## Functions

Tailwind includes build-time functions that simplify working with colors and spacing.

### `--alpha()`

Adjust the opacity of a color:

```css
.my-element {
  color: --alpha(var(--color-lime-300) / 50%);
}
```

Compiled output:

```css
.my-element {
  color: color-mix(in oklab, var(--color-lime-300) 50%, transparent);
}
```

### `--spacing()`

Generate spacing values based on your theme scale:

```css
.my-element {
  margin: --spacing(4);
}
```

Compiled output:

```css
.my-element {
  margin: calc(var(--spacing) * 4);
}
```

You can also use this function within arbitrary values:

```html
<div class="py-[calc(--spacing(4)-1px)]">
  <!-- ... -->
</div>
```

## Compatibility

The following directives and functions exist for compatibility with Tailwind CSS v3.x. Items defined in CSS take precedence over values declared in JavaScript configuration files, presets, and plugins.

### `@config`

Load a legacy JavaScript-based Tailwind configuration file:

```css
@config "../../tailwind.config.js";
```

> **Note:** The `corePlugins`, `safelist`, and `separator` options from JavaScript configs are not supported in Tailwind v4. To safelist utilities, use `@source inline()`.

### `@plugin`

Load a legacy JavaScript-based plugin:

```css
@plugin "@tailwindcss/typography";
```

The directive accepts either a package name or local path.

### `theme()`

Access Tailwind theme values using dot notation:

```css
.my-element {
  margin: theme(spacing.12);
}
```

This function is deprecated; prefer CSS theme variables going forward.

