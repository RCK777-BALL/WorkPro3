import React, { useEffect, useState } from 'react';
import AssetModal from '../components/modals/AssetModal';
import UploadDropzone from '../components/UploadDropzone';
import { fetchAssets, createAsset } from '../api/endpoints/assets';

const Assets: React.FC = () => {
  const [assets, setAssets] = useState<Array<{ id: string; name: string; status?: string }>>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchAssets().then((response) => setAssets(response.items));
  }, []);

  const handleSave = async (payload: { name: string; location?: string }) => {
    await createAsset(payload);
    const response = await fetchAssets();
    setAssets(response.items);
    setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Assets</h1>
          <p className="text-sm text-neutral-500">Track critical equipment, docs, and history.</p>
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white" onClick={() => setIsOpen(true)}>
          Add asset
        </button>
      </header>

      <UploadDropzone onFiles={() => undefined} />

      <div className="rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} className="border-b border-neutral-100">
                <td className="px-4 py-2 text-neutral-900">{asset.name}</td>
                <td className="px-4 py-2 text-neutral-600">{asset.status ?? 'Active'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AssetModal isOpen={isOpen} onClose={() => setIsOpen(false)} onSave={handleSave} />
    </div>
  );
};

export default Assets;
