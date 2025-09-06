import React from 'react';
import Button from '../../components/common/Button';
import api from '../../lib/api';

interface Props {
  orderId: string;
  onReceived?: () => void;
}

const TransferReceive: React.FC<Props> = ({ orderId, onReceived }) => {
  const receive = async () => {
    await api.post(`/transfers/${orderId}/receive`);
    onReceived?.();
  };
  return (
    <Button variant="success" onClick={receive}>
      Receive Transfer
    </Button>
  );
};

export default TransferReceive;
