/*
 * SPDX-License-Identifier: MIT
 */

import { useState, type ChangeEvent } from 'react';
import Card from '@/components/common/Card';
import http from '@/lib/http';

type ImportType = 'assets' | 'parts' | 'departments';

interface DepartmentImportIssue {
  row: number;
  reason: string;
}

interface DepartmentImportReport {
  rowsProcessed: number;
  rowsSkipped: number;
  departmentsCreated: number;
  departmentsUpdated: number;
  linesCreated: number;
  linesUpdated: number;
  stationsCreated: number;
  stationsUpdated: number;
  issues: DepartmentImportIssue[];
}

type ImportResponse = { imported: number } | DepartmentImportReport;

const isCountResponse = (response: ImportResponse): response is { imported: number } => {
  return Object.prototype.hasOwnProperty.call(response, 'imported');
};

export default function Imports() {
  const [assetCount, setAssetCount] = useState<number | null>(null);
  const [partCount, setPartCount] = useState<number | null>(null);
  const [departmentResult, setDepartmentResult] = useState<DepartmentImportReport | null>(null);
  const [loading, setLoading] = useState(false);

  const upload = async (type: ImportType, file: File) => {
    const form = new FormData();
    form.append('file', file);
    if (type === 'assets') setAssetCount(null);
    if (type === 'parts') setPartCount(null);
    if (type === 'departments') setDepartmentResult(null);
    setLoading(true);
    try {
      const res = await http.post<ImportResponse>(`/import/${type}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (isCountResponse(res.data)) {
        if (type === 'assets') setAssetCount(res.data.imported);
        if (type === 'parts') setPartCount(res.data.imported);
      } else {
        setDepartmentResult(res.data);
      }
    } catch (err) {
      console.error('Import failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (type: ImportType) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void upload(type, file);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Import Assets">
        <div className="flex items-center gap-4">
          <input type="file" accept=".csv" onChange={handleFile('assets')} />
          {assetCount !== null && <span>{assetCount} imported</span>}
        </div>
      </Card>

      <Card title="Import Parts">
        <div className="flex items-center gap-4">
          <input type="file" accept=".csv" onChange={handleFile('parts')} />
          {partCount !== null && <span>{partCount} imported</span>}
        </div>
      </Card>
      <Card title="Import Departments, Lines & Stations">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <input type="file" accept=".csv" onChange={handleFile('departments')} />
          {departmentResult && (
            <div className="text-sm space-y-1">
              <p>
                Processed {departmentResult.rowsProcessed} row
                {departmentResult.rowsProcessed === 1 ? '' : 's'}; skipped {departmentResult.rowsSkipped}.
              </p>
              <p>
                Departments created: {departmentResult.departmentsCreated}, updated:{' '}
                {departmentResult.departmentsUpdated}
              </p>
              <p>
                Lines created: {departmentResult.linesCreated}, updated: {departmentResult.linesUpdated}
              </p>
              <p>
                Stations created: {departmentResult.stationsCreated}, updated: {departmentResult.stationsUpdated}
              </p>
              {departmentResult.issues.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-blue-600 hover:underline">
                    View import notes
                  </summary>
                  <ul className="ml-6 mt-1 list-disc space-y-1">
                    {departmentResult.issues.map((issue) => (
                      <li key={`${issue.row}-${issue.reason}`}>
                        Row {issue.row}: {issue.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </Card>
      {loading && <p>Uploading...</p>}
    </div>
  );
}
