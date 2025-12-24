/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import type { ExportJob } from './types';

const exportOptions = [
  { label: 'Work Orders', value: 'workOrders' },
  { label: 'Assets', value: 'assets' },
];

export default function ExportsPanel() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [type, setType] = useState(exportOptions[0].value);
  const [format, setFormat] = useState('csv');

  const loadJobs = () => {
    fetch('/api/integrations/exports')
      .then((res) => res.json())
      .then((res) => setJobs(res.data ?? []));
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const queueExport = async () => {
    const res = await fetch('/api/integrations/exports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, format }),
    });
    const json = await res.json();
    if (json?.data) {
      setJobs([json.data, ...jobs]);
    }
  };

  return (
    <section>
      <h2>Exports</h2>
      <div>
        <select value={type} onChange={(event) => setType(event.target.value)}>
          {exportOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={format} onChange={(event) => setFormat(event.target.value)}>
          <option value="csv">CSV</option>
          <option value="xlsx">XLSX</option>
        </select>
        <button type="button" onClick={queueExport}>
          Queue export
        </button>
      </div>
      <ul>
        {jobs.map((job) => (
          <li key={job._id}>
            {job.type} ({job.format}) - {job.status}
            {job.status === 'completed' ? (
              <a href={`/api/integrations/exports/${job._id}/download`}>Download</a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
