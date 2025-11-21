import React, { useEffect, useState } from 'react';

interface InspectionSchedule {
  id: string;
  templateId: string;
  scheduledFor: string;
  status: string;
  workOrderId?: string;
  siteId?: string;
}

const InspectionTracker: React.FC = () => {
  const [inspections, setInspections] = useState<InspectionSchedule[]>([]);

  useEffect(() => {
    fetch('/api/safety/inspections')
      .then((res) => res.json())
      .then((payload) => setInspections(payload.data ?? []))
      .catch(() => setInspections([]));
  }, []);

  const markComplete = async (inspectionId: string) => {
    await fetch(`/api/safety/inspections/${inspectionId}/complete`, { method: 'POST' });
    setInspections((prev) => prev.map((item) => (item.id === inspectionId ? { ...item, status: 'completed' } : item)));
  };

  return (
    <div className="inspection-tracker">
      <header>
        <h3>Inspection tracking</h3>
        <p>Monitor scheduled safety inspections and permit reviews tied to work orders.</p>
      </header>
      <table>
        <thead>
          <tr>
            <th>Template</th>
            <th>Work order</th>
            <th>Site</th>
            <th>Schedule</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {inspections.map((inspection) => (
            <tr key={inspection.id}>
              <td>{inspection.templateId}</td>
              <td>{inspection.workOrderId ?? 'Unassigned'}</td>
              <td>{inspection.siteId ?? 'Global'}</td>
              <td>{new Date(inspection.scheduledFor).toLocaleString()}</td>
              <td>{inspection.status}</td>
              <td>
                {inspection.status !== 'completed' ? (
                  <button onClick={() => markComplete(inspection.id)}>Mark complete</button>
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
