/*
 * SPDX-License-Identifier: MIT
 */

declare module 'mongoose' {
  // Compatibility alias for codepaths importing FilterQuery from mongoose.
  export type FilterQuery<T> = Record<string, any>;
}
