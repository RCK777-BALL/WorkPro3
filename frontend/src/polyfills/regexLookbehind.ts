/*
 * SPDX-License-Identifier: MIT
 */

/**
 * Some bundled dependencies rely on regular expression lookbehind, which is
 * unsupported in a few browsers (for example, older Safari versions). When a
 * lookbehind-only pattern is passed to `new RegExp` the page throws a
 * `SyntaxError` before our components render. This shim softens that failure
 * by stripping lookbehind groups from the pattern so execution can continue.
 */
(() => {
  try {
    // Quick capability test – modern browsers pass silently.
    void new RegExp('(?<=x)y');
    return;
  } catch {
    // Unsupported environment: install a defensive wrapper.
  }

  const NativeRegExp = RegExp;

  const SafeRegExp = function (pattern: RegExp | string, flags?: string) {
    if (typeof pattern === 'string') {
      try {
        return new NativeRegExp(pattern, flags);
      } catch {
        const sanitizedPattern = pattern.replace(/\(\?<=[^)]*\)/g, '');
        return new NativeRegExp(sanitizedPattern, flags);
      }
    }

    return new NativeRegExp(pattern, flags as unknown as string);
  } as unknown as RegExpConstructor;

  Object.setPrototypeOf(SafeRegExp, NativeRegExp);
  Object.defineProperty(SafeRegExp, 'prototype', { value: NativeRegExp.prototype });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).RegExp = SafeRegExp;
})();
