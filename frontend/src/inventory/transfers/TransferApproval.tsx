import React from 'react';
import Button from '../../components/common/Button';
import api from '../../utils/api';

interface Props {
  orderId: string;
  onApproved?: () => void;
}

const TransferApproval: React.FC<Props> = ({ orderId, onApproved }) => {
  const approve = async () => {
    await api.post(`/transfers/${orderId}/approve`);
    onApproved?.();
  };
  return (
    <Button variant="primary" onClick={approve}>
      Approve Transfer
    </Button>
  );
};

export default TransferApproval;
