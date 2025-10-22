/*
 * SPDX-License-Identifier: MIT
 */

interface EmailJob {
  to: string;
  subject: string;
  body: string;
}

export const enqueueEmailRetry = async (_job: EmailJob): Promise<void> => {
  // no-op stub for integration tests
};

export default {
  enqueueEmailRetry,
};
