/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

const router = Router();

const statuses = [
  { label: 'Open', color: 'red' },
  { label: 'In Progress', color: 'yellow' },
  { label: 'Pending Approval', color: 'purple' },
  { label: 'Completed', color: 'green' },
  { label: 'On Hold', color: 'gray' },
  { label: 'Cancelled', color: 'slate' },
];

router.get('/', (_req, res) => {
  res.json({ statuses, updatedAt: new Date().toISOString() });
});

export default router;

