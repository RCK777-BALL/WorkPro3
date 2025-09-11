/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import WorkOrderForm from './WorkOrderForm';
import type { WorkOrder } from '../../types';

interface Props {
  workOrder: WorkOrder;
  onSuccess?: (wo: WorkOrder) => void;
}

const EditWorkOrderForm: React.FC<Props> = ({ workOrder, onSuccess }) => (
  <WorkOrderForm workOrder={workOrder} onSuccess={onSuccess} />
);

export default EditWorkOrderForm;
