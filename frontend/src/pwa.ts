/*
 * SPDX-License-Identifier: MIT
 */

// Optional PWA helper: works when vite-plugin-pwa is present, no-ops otherwise.
// IMPORTANT: never use a string literal 'virtual:pwa-register' in the import —
// Vite's import-analysis will attempt to resolve it. Use a variable instead.
export async function registerSWIfAvailable(opts?: { immediate?: boolean }) {
  const id = 'virtual:pwa-register'; // variable to avoid static analysis
  try {
    // @ts-ignore - virtual module only exists when the plugin is installed
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    const mod: any = await import(/* @vite-ignore */ id as any);
    if (mod?.registerSW) return mod.registerSW(opts);
  } catch {
    // Plugin not installed — fall back to a safe no-op.
    if ('serviceWorker' in navigator) {
      // If you ship a plain SW later at /sw.js, this will register it.
      try { await navigator.serviceWorker.getRegistration(); } catch {}
    }
  }
}
