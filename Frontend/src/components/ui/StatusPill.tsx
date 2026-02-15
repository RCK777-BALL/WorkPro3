import React from 'react';
import { statusBadgeMap, statusColors } from '@/theme/status';

interface StatusPillProps {
  value: string;
}

export default function StatusPill({ value }: StatusPillProps) {
  const token = statusBadgeMap[value.toLowerCase()] ?? 'neutral';
  const colors = statusColors[token];

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.fg, borderColor: colors.border }}
    >
      {value.replace(/_/g, ' ')}
    </span>
  );
}
