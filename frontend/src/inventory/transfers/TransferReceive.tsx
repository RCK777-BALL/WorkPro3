/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Button from '../../components/common/Button';
import http from '../../lib/http';

interface Props {
  orderId: string;
  onReceived?: () => void;
}

const TransferReceive: React.FC<Props> = ({ orderId, onReceived }) => {
  const receive = async () => {
    await http.post(`/transfers/${orderId}/receive`);
    onReceived?.();
  };
  return (
    <Button variant="success" onClick={receive}>
      Receive Transfer
    </Button>
  );
};

export default TransferReceive;
