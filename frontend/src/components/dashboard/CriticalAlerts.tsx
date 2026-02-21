/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import Card from '@/components/common/Card';

interface AlertItem {
  id: string;
  assetName: string;
  issue: string;
  timestamp: string;
}

interface CriticalAlertsProps {
  alerts: AlertItem[];
}

const getTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const CriticalAlerts: React.FC<CriticalAlertsProps> = ({ alerts }) => {
  return (
    <Card title="Critical Alerts" subtitle="Recent system warnings">
      <ul className="space-y-2 text-sm">
        {alerts.map((a) => (
          <li key={a.id} className="flex justify-between">
            <span>
              {a.assetName} — {a.issue}
            </span>
            <span className="opacity-70">{getTimeAgo(a.timestamp)}</span>
          </li>
        ))}
        {alerts.length === 0 && <li className="opacity-70">No critical alerts</li>}
      </ul>
    </Card>
  );
};

export default CriticalAlerts;
