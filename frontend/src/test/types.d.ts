import type { Db } from 'mongodb';
import type { AxeResults } from 'jest-axe';

declare global {
  var testDb: Db;
}

declare module 'vitest' {
  interface Assertion<T = AxeResults> {
    toHaveNoViolations(): T;
  }
}

export {};
