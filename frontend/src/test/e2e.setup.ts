/*
 * SPDX-License-Identifier: MIT
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';

let mongod: MongoMemoryServer;
let connection: MongoClient;
let db!: Db;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  connection = await MongoClient.connect(uri);
  db = connection.db('test-db');

  // Make db available to tests
  global.testDb = db;
});

afterAll(async () => {
  await connection.close();
  await mongod.stop();
});

beforeEach(async () => {
  // Clean up the database before each test
  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});
