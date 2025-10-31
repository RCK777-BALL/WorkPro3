/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';

import Card from '@/components/common/Card';
import http from '@/lib/http';

interface SummaryResponse {
  totalPlants: number;
  totalDepartments: number;
}

const MultiSiteSummary: React.FC = () => {
  const [summary, setSummary] = useState<SummaryResponse>({ totalPlants: 0, totalDepartments: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const response = await http.get<SummaryResponse>('/global/summary');
        if (!mounted) return;
        setSummary(response.data);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load global summary', err);
        setError('Unable to load multi-site overview');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchSummary();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card title="Global Overview" subtitle="Multi-site footprint">
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <div className="space-y-2 text-sm text-neutral-200">
          <div className="flex items-center justify-between">
            <span>Total Plants</span>
            <span className="font-semibold text-white">
              {loading ? '…' : summary.totalPlants}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Total Departments</span>
            <span className="font-semibold text-white">
              {loading ? '…' : summary.totalDepartments}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default MultiSiteSummary;
