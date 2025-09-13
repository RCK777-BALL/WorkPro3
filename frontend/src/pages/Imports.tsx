/*
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';
import Card from '@/components/common/Card';
import http from '@/lib/http';

export default function Imports() {
  const [assetCount, setAssetCount] = useState<number | null>(null);
  const [partCount, setPartCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const upload = async (type: 'assets' | 'parts', file: File) => {
    const form = new FormData();
    form.append('file', file);
    setLoading(true);
    try {
      const res = await http.post<{ imported: number }>(`/import/${type}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (type === 'assets') setAssetCount(res.data.imported);
      else setPartCount(res.data.imported);
    } catch (err) {
      console.error('Import failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (type: 'assets' | 'parts') => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) upload(type, file);
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
      {loading && <p>Uploading...</p>}
    </div>
  );
}
