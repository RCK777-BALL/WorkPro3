import { z } from 'zod';

export const colorScheme = z.enum(['light', 'dark']);
export type ColorScheme = z.infer<typeof colorScheme>;

