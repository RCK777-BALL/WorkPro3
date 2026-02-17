/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';
import Button from '@/components/common/Button';
import { useToast } from '@/context/ToastContext';
import http from '@/lib/http';

const PMScheduler: React.FC = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    try {
      setLoading(true);
      const res = await http.post<{ generated: number }>('/pm/generate');
      addToast(`Generated ${res.data?.generated ?? 0} work orders`, 'success');
    } catch {
      addToast('Failed to generate work orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">PM Scheduler</h1>
      <Button variant="primary" onClick={generate} disabled={loading}>
        Generate WOs
      </Button>
    </div>
  );
};

export default PMScheduler;

