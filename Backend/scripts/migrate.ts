/*
 * SPDX-License-Identifier: MIT
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pathToFileURL } from 'url';
import { MongoClient } from 'mongodb';
import logger from '../utils/logger';

type MigrationModule = {
  run: () => Promise<void> | void;
  name?: string;
};

type MigrationRecord = {
  name: string;
  filename: string;
  checksum: string;
  appliedAt: Date;
  durationMs: number;
};

type CliOptions = {
  dryRun: boolean;
  list: boolean;
  only?: string;
  from?: string;
  to?: string;
};

const DEFAULT_URI = 'mongodb://localhost:27017/WorkPro3';
const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');
const COLLECTION = 'migrations';

const parseArgs = (argv: string[]): CliOptions => {
  const opts: CliOptions = { dryRun: false, list: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    if (arg === '--list') opts.list = true;
    if (arg === '--only') opts.only = argv[i + 1];
    if (arg === '--from') opts.from = argv[i + 1];
    if (arg === '--to') opts.to = argv[i + 1];
  }
  return opts;
};

const sha256 = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex');

const readMigrations = (): string[] => {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.ts'))
    .sort();
};

const resolveName = (filename: string, moduleName?: string) =>
  moduleName && moduleName.trim() ? moduleName.trim() : filename.replace(/\.ts$/, '');

const loadMigration = async (filename: string): Promise<MigrationModule> => {
  const fullPath = path.resolve(MIGRATIONS_DIR, filename);
  const moduleUrl = pathToFileURL(fullPath).toString();
  const mod = (await import(moduleUrl)) as MigrationModule;
  if (!mod || typeof mod.run !== 'function') {
    throw new Error(`Migration ${filename} does not export a run() function.`);
  }
  return mod;
};

const resolveSelection = (files: string[], opts: CliOptions): string[] => {
  let selected = files;

  if (opts.only) {
    selected = selected.filter((file) => file.includes(opts.only!));
  }

  if (opts.from) {
    const fromIndex = selected.findIndex((file) => file.includes(opts.from!));
    if (fromIndex >= 0) {
      selected = selected.slice(fromIndex);
    }
  }

  if (opts.to) {
    const toIndex = selected.findIndex((file) => file.includes(opts.to!));
    if (toIndex >= 0) {
      selected = selected.slice(0, toIndex + 1);
    }
  }

  return selected;
};

async function run() {
  const opts = parseArgs(process.argv.slice(2));
  const uri = process.env.MONGO_URI || DEFAULT_URI;

  const files = readMigrations();
  if (files.length === 0) {
    logger.info('No migrations found.');
    return;
  }

  const selected = resolveSelection(files, opts);
  if (selected.length === 0) {
    logger.info('No migrations matched selection.');
    return;
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const collection = db.collection<MigrationRecord>(COLLECTION);

  try {
    const applied = await collection.find({}).toArray();
    const appliedMap = new Map(applied.map((rec) => [rec.filename, rec]));

    if (opts.list) {
      const rows = files.map((file) => ({
        file,
        applied: appliedMap.has(file) ? 'yes' : 'no',
      }));
      logger.info('Migrations', rows);
      return;
    }

    for (const filename of selected) {
      const fullPath = path.resolve(MIGRATIONS_DIR, filename);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const checksum = sha256(content);
      const existing = appliedMap.get(filename);

      if (existing) {
        if (existing.checksum !== checksum) {
          throw new Error(
            `Migration checksum mismatch for ${filename}. Refusing to run.`,
          );
        }
        logger.info(`Skipping already applied migration: ${filename}`);
        continue;
      }

      if (opts.dryRun) {
        logger.info(`Dry run: would apply ${filename}`);
        continue;
      }

      const module = await loadMigration(filename);
      const name = resolveName(filename, module.name);
      const started = Date.now();
      logger.info(`Applying migration: ${filename}`);

      await module.run();

      const durationMs = Date.now() - started;
      await collection.insertOne({
        name,
        filename,
        checksum,
        appliedAt: new Date(),
        durationMs,
      });

      logger.info(`Applied migration: ${filename} (${durationMs}ms)`);
    }
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  logger.error('Migration runner failed', err);
  process.exit(1);
});
