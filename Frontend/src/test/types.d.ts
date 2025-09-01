import { Db } from 'mongodb';

declare global {
  var testDb: Db;
}

export {};
