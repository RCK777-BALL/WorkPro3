/* eslint-disable @typescript-eslint/no-unused-vars */

/*
 * SPDX-License-Identifier: MIT
 */

declare module 'mongoose' {
  // Compatibility alias for codepaths importing FilterQuery from mongoose.
  export type FilterQuery<_T = unknown> = Record<string, any>;
}
