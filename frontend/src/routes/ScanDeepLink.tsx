/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const resolveTarget = (type: string, id: string): string | null => {
  const normalized = type.toLowerCase();
  if (normalized === 'asset') return `/assets/${id}`;
  if (normalized === 'work-order' || normalized === 'workorder' || normalized === 'wo') return `/work-orders/${id}`;
  if (normalized === 'part') return `/parts/${id}`;
  return null;
};

const ScanDeepLink: React.FC = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!type || !id) {
      setError('Scan link is incomplete.');
      return;
    }

    const target = resolveTarget(type, id);
    if (!target) {
      setError('Unsupported scan link.');
      return;
    }

    navigate(target, { replace: true });
  }, [id, navigate, type]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <AlertTriangle className="h-6 w-6 text-amber-500" />
        <p className="text-sm text-neutral-700 dark:text-neutral-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-neutral-600 dark:text-neutral-300">
      Redirecting to scan details…
    </div>
  );
};

export default ScanDeepLink;
