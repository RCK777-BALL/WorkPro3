export interface SafeStringifyOptions {
  maxLength?: number;
}

/**
 * Safely stringify objects that may contain circular references.
 * Truncates output when exceeding the provided maxLength.
 */
export const safeStringify = (
  value: unknown,
  options: SafeStringifyOptions = {}
): string => {
  const { maxLength = 10000 } = options;
  const seen = new WeakSet();

  const str = JSON.stringify(
    value,
    (_key, val) => {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      return val;
    },
    2
  );

  if (str.length > maxLength) {
    return `${str.slice(0, maxLength)}... (truncated)`;
  }

  return str;
};
