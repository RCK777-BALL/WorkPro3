/*
 * SPDX-License-Identifier: MIT
 */

import os from 'os';
import JobLock from '../models/JobLock';
import logger from './logger';

const OWNER_ID = `${os.hostname()}-${process.pid}`;

export const acquireJobLock = async (name: string, ttlMs: number): Promise<boolean> => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  try {
    const lock = await JobLock.findOneAndUpdate(
      {
        name,
        $or: [{ expiresAt: { $lte: now } }, { ownerId: OWNER_ID }],
      },
      {
        $set: {
          ownerId: OWNER_ID,
          expiresAt,
          updatedAt: now,
        },
        $setOnInsert: {
          acquiredAt: now,
        },
      },
      {
        upsert: true,
        new: true,
      },
    );

    return lock?.ownerId === OWNER_ID;
  } catch (err: any) {
    if (err?.code === 11000) {
      return false;
    }
    logger.warn(`Job lock error for ${name}`, err);
    return false;
  }
};

export const releaseJobLock = async (name: string): Promise<void> => {
  try {
    await JobLock.updateOne(
      { name, ownerId: OWNER_ID },
      { $set: { expiresAt: new Date(0), updatedAt: new Date() } },
    );
  } catch (err) {
    logger.warn(`Failed to release lock ${name}`, err);
  }
};

export const runWithJobLock = async (
  name: string,
  ttlMs: number,
  task: () => Promise<void>,
): Promise<void> => {
  const acquired = await acquireJobLock(name, ttlMs);
  if (!acquired) {
    logger.info(`[JobLock] Skipping ${name}; lock held by another node.`);
    return;
  }

  try {
    await task();
  } finally {
    await releaseJobLock(name);
  }
};

export default { acquireJobLock, releaseJobLock, runWithJobLock };
