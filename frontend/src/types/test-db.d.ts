import type { Db } from 'mongodb';

declare const testDb: Db;

declare global {
  // eslint-disable-next-line no-var
  var testDb: Db;

  interface GlobalThis {
    testDb: Db;
  }
}

export {};
