import React, { useEffect, useState } from 'react';

import type { InspectionRecord } from '../../../../shared/types/inspection';

const InspectionTracker: React.FC = () => {
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const res = await fetch('/api/inspections/records');
      const payload = await res.json();
      setInspections(payload.data ?? []);
    } catch (err) {
      console.error(err);
      setError('Unable to load inspections');
      setInspections([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const markComplete = async (inspectionId: string) => {
    await fetch(`/api/inspections/records/${inspectionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: 'Completed via UI', responses: [] }),
    });
    setInspections((prev) => prev.map((item) => (item._id === inspectionId ? { ...item, status: 'completed' } : item)));
  };

  return (
    <div className="inspection-tracker">
      <header>
        <h3>Inspection tracking</h3>
        <p>Monitor scheduled safety inspections and permit reviews tied to work orders.</p>
      </header>
      {error ? <p className="text-red-600">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Template</th>
            <th>Asset</th>
            <th>Site</th>
            <th>Status</th>
            <th>Started</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {inspections.map((inspection) => (
            <tr key={inspection._id ?? inspection.id}>
              <td>{inspection.templateName}</td>
              <td>{inspection.assetId ?? 'Unassigned'}</td>
              <td>{inspection.siteId ?? 'Global'}</td>
              <td>{inspection.status}</td>
              <td>{inspection.startedAt ? new Date(inspection.startedAt).toLocaleString() : '—'}</td>
              <td>
                {inspection.status !== 'completed' ? (
                  <button onClick={() => markComplete(inspection._id ?? inspection.id!)}>Mark complete</button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InspectionTracker;
