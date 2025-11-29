import { useCallback } from 'react';

type RequestPayload = {
  title: string;
  description?: string;
  requesterName: string;
  requesterEmail?: string;
  priority?: string;
};

export function useRequests() {
  const submitRequest = useCallback(async (payload: RequestPayload, photos?: FileList | File[]) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    (photos ? Array.from(photos) : []).forEach((file) => formData.append('photos', file));

    const res = await fetch('/api/public/requests/default', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to submit request');
    return res.json();
  }, []);

  const getStatus = useCallback(async (token: string) => {
    const res = await fetch(`/api/public/requests/status/${token}`);
    if (!res.ok) throw new Error('Unable to load status');
    return res.json();
  }, []);

  return { submitRequest, getStatus };
}
