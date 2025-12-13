import { useCallback } from 'react';

const jsonHeaders = { 'Content-Type': 'application/json' };

export function useWorkOrders() {
  const approveWorkOrder = useCallback(async (id: string, note?: string) => {
    const res = await fetch(`/api/workorders/${id}/approve`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ status: 'approved', note }),
    });
    if (!res.ok) throw new Error('Failed to approve work order');
    return res.json();
  }, []);

  const updateChecklist = useCallback(async (id: string, checklist: unknown[]) => {
    const res = await fetch(`/api/workorders/${id}/checklist`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ checklist }),
    });
    if (!res.ok) throw new Error('Failed to update checklist');
    return res.json();
  }, []);

  return { approveWorkOrder, updateChecklist };
}
