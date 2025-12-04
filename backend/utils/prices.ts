export interface LocalizedPriceOptions {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
}

export function formatPrice(value: number, options: LocalizedPriceOptions = {}): string {
  const { currency = "USD", locale = "en-US", minimumFractionDigits = 2 } = options;
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
  });
  return formatter.format(value);
}

export function parsePrice(value: string): number {
  const normalized = value.replace(/[^0-9.-]+/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}
