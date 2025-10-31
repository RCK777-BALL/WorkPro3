/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';

import Card from '@/components/common/Card';
import http from '@/lib/http';

interface StationResponse {
  _id: string;
  name: string;
  lineId: string;
  departmentId: string;
  notes?: string;
}

const Stations: React.FC = () => {
  const [stations, setStations] = useState<StationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchStations = async () => {
      setLoading(true);
      try {
        const response = await http.get<StationResponse[]>('/stations');
        if (!mounted) return;
        setStations(response.data);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load stations', err);
        setError('Unable to load stations for this plant');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStations();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-100">Stations</h1>
        <p className="text-sm text-neutral-400">
          Explore stations grouped under the currently selected plant.
        </p>
      </header>
      <Card title="Station directory">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-700 text-sm text-neutral-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Station</th>
                  <th className="px-3 py-2 text-left font-medium">Line</th>
                  <th className="px-3 py-2 text-left font-medium">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {loading ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={3}>
                      Loading stations…
                    </td>
                  </tr>
                ) : (
                  stations.map((station) => (
                    <tr key={station._id}>
                      <td className="px-3 py-3 font-medium text-white">{station.name}</td>
                      <td className="px-3 py-3">{station.lineId}</td>
                      <td className="px-3 py-3">{station.departmentId}</td>
                    </tr>
                  ))
                )}
                {!loading && stations.length === 0 && !error ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={3}>
                      No stations available for this plant.
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

export default Stations;
