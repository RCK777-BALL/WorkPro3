import React from 'react';
import WorkOrderForm from './WorkOrderForm';
import type { WorkOrder } from '@/types';

interface Props {
  onSuccess?: (wo: WorkOrder) => void;
}

const AddWorkOrderForm: React.FC<Props> = ({ onSuccess }) => (
  <WorkOrderForm onSuccess={onSuccess} />
);

export default AddWorkOrderForm;
