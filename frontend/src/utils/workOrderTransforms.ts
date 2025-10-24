/*
 * SPDX-License-Identifier: MIT
 */

export type ChecklistFormValue = { text: string; done: boolean };
export type SignatureFormValue = { by: string; ts: string };

type ChecklistLike = { text?: unknown; description?: unknown; done?: unknown; completed?: unknown };
type SignatureLike = { by?: unknown; userId?: unknown; ts?: unknown; signedAt?: unknown };

const pad = (value: number) => value.toString().padStart(2, '0');

const toLocalDateTime = (value: unknown): string => {
  if (!value) return '';
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const mapChecklistsToApi = (
  items: ChecklistFormValue[],
): { description: string; done?: boolean }[] =>
  items
    .map((item) => ({ text: item.text.trim(), done: item.done }))
    .filter((item) => item.text.length > 0)
    .map((item) => ({ description: item.text, done: item.done }));

export const mapChecklistsFromApi = (items: unknown): ChecklistFormValue[] => {
  if (!Array.isArray(items)) return [];
  return (items as ChecklistLike[]).map((item) => ({
    text: typeof item.text === 'string' && item.text.trim().length > 0
      ? item.text
      : typeof item.description === 'string'
        ? item.description
        : '',
    done: Boolean(item.done ?? item.completed),
  }));
};

export const mapSignaturesToApi = (
  items: SignatureFormValue[],
): { userId: string; signedAt?: string }[] =>
  items
    .map((item) => ({ by: item.by.trim(), ts: item.ts.trim() }))
    .filter((item) => item.by.length > 0)
    .map((item) => ({
      userId: item.by,
      ...(item.ts.length > 0 ? { signedAt: item.ts } : {}),
    }));

export const mapSignaturesFromApi = (items: unknown): SignatureFormValue[] => {
  if (!Array.isArray(items)) return [];
  return (items as SignatureLike[]).map((item) => ({
    by: typeof item.by === 'string' && item.by.trim().length > 0
      ? item.by
      : typeof item.userId === 'string'
        ? item.userId
        : '',
    ts: toLocalDateTime(item.ts ?? item.signedAt),
  }));
};
