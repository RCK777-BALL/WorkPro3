/*
 * SPDX-License-Identifier: MIT
 */

import Badge from '@common/Badge';

interface StatusBadgeProps {
  /** Status text to display */
  status: string;
  /** Visual size of the badge */
  size?: 'sm' | 'md';
  className?: string;
}

export default function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  return <Badge text={status} type="status" size={size} className={className} />;
}

