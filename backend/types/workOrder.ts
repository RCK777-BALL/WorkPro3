/*
 * SPDX-License-Identifier: MIT
 */

import type { z } from 'zod';
import type { SharedWorkOrder } from '../shared/workorder';
import { workOrderCreateSchema } from '../src/schemas/workOrder';

export type WorkOrderType = SharedWorkOrder;
export type WorkOrderInput = z.infer<typeof workOrderCreateSchema>;
