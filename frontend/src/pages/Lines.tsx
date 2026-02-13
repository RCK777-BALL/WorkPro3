/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';

import Card from '@/components/common/Card';
import http from '@/lib/http';

interface LineResponse {
  _id: string;
  name: string;
  departmentId: string;
  notes?: string;
  stations: string[];
}

const Lines: React.FC = () => {
  const [lines, setLines] = useState<LineResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchLines = async () => {
      setLoading(true);
      try {
        const response = await http.get<LineResponse[]>('/lines');
        if (!mounted) return;
        setLines(response.data);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load lines', err);
        setError('Unable to load production lines');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchLines();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-100">Plant Lines</h1>
        <p className="text-sm text-neutral-400">
          Review departments and associated production lines for the active plant.
        </p>
      </header>
      <Card title="Lines overview">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-700 text-sm text-neutral-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Line</th>
                  <th className="px-3 py-2 text-left font-medium">Department</th>
                  <th className="px-3 py-2 text-left font-medium">Stations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {loading ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={3}>
                      Loading lines…
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr key={line._id}>
                      <td className="px-3 py-3 font-medium text-white">{line.name}</td>
                      <td className="px-3 py-3">{line.departmentId}</td>
                      <td className="px-3 py-3">{line.stations.length}</td>
                    </tr>
                  ))
                )}
                {!loading && lines.length === 0 && !error ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={3}>
                      No lines available for this plant.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Lines;
