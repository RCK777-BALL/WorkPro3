import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchAssetById } from '../api/endpoints/assets';

const AssetDetail: React.FC = () => {
  const { assetId } = useParams();
  const [asset, setAsset] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!assetId) return;
    fetchAssetById(assetId).then(setAsset);
  }, [assetId]);

  if (!asset) {
    return <div className="text-sm text-neutral-500">Loading asset…</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900">{String(asset.name ?? 'Asset')}</h1>
        <p className="text-sm text-neutral-500">QR: {String(asset.qrCode ?? 'N/A')}</p>
      </header>
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-700">Details</h2>
        <div className="mt-2 grid gap-2 text-sm text-neutral-600">
          <p>Location: {String(asset.location ?? 'Unknown')}</p>
          <p>Status: {String(asset.status ?? 'Active')}</p>
          <p>Serial: {String(asset.serialNumber ?? '—')}</p>
        </div>
      </section>
    </div>
  );
};

export default AssetDetail;
