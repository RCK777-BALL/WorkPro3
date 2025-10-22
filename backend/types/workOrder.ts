/*
 * SPDX-License-Identifier: MIT
 */

import type { z } from 'zod';
import type { WorkOrder as SharedWorkOrder } from '@shared/workOrder';
import { workOrderCreateSchema } from '../src/schemas/workOrder';

export type WorkOrderType = SharedWorkOrder;
export type WorkOrderInput = z.infer<typeof workOrderCreateSchema>;
