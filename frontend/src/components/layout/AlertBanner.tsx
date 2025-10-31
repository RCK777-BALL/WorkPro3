/*
 * SPDX-License-Identifier: MIT
 */

import { AlertTriangle } from 'lucide-react';
import { useAlertStore } from '@/store/alertStore';

export default function AlertBanner() {
  const latest = useAlertStore((state) => state.alerts[0]);

  if (!latest) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <AlertTriangle size={18} className="mt-0.5 text-amber-400" />
      <div>
        <p className="font-medium text-amber-200">AI Alert</p>
        <p className="text-amber-100">{latest.message}</p>
      </div>
    </div>
  );
}
