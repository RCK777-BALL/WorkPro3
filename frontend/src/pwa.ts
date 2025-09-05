// Safe registrar: no-ops if vite-plugin-pwa isn't installed.
export async function registerSWIfAvailable(opts?: { immediate?: boolean }) {
  try {
    const mod = await import(/* @vite-ignore */ 'virtual:pwa-register');
    return (mod as any).registerSW?.(opts);
  } catch {
    // plugin not present => ignore
  }
}
