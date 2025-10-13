/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import http from '@/lib/http';
import Drawer from '@/components/ui/Drawer';
import Button from '@/components/common/Button';
import AssetQRCode from '@/components/qr/AssetQRCode';
import WorkOrderModal from '@/components/work-orders/WorkOrderModal';
import type { Asset } from '@/types';

interface TreeAsset extends Asset {
  qr: string;
}
interface StationNode {
  id: string;
  name: string;
  assets: TreeAsset[];
}
interface LineNode {
  id: string;
  name: string;
  stations: StationNode[];
}
interface AreaNode {
  id: string;
  name: string;
  lines: LineNode[];
}
interface SiteNode {
  id: string;
  name: string;
  areas: AreaNode[];
}

const Assets = () => {
  const [tree, setTree] = useState<SiteNode[]>([]);
  const [assets, setAssets] = useState<TreeAsset[]>([]);
  const [selected, setSelected] = useState<TreeAsset | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [woOpen, setWoOpen] = useState(false);

  useEffect(() => {
    http.get('/assets/tree').then((res) => setTree(res.data));
  }, []);

  const renderTree = () => (
    <div className="space-y-2">
      {tree.map((site) => (
        <div key={site.id}>
          <p className="font-semibold">{site.name}</p>
          <ul className="ml-4 space-y-1">
            {site.areas.map((area) => (
              <li key={area.id}>
                <p className="font-medium">{area.name}</p>
                <ul className="ml-4 space-y-1">
                  {area.lines.map((line) => (
                    <li key={line.id}>
                      <p>{line.name}</p>
                      <ul className="ml-4 space-y-1">
                        {line.stations.map((st) => (
                          <li key={st.id}>
                            <button
                              onClick={() => setAssets(st.assets)}
                              className="text-left hover:underline"
                            >
                              {st.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex gap-4">
      <div className="w-1/3 bg-white border p-4 rounded overflow-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
        {renderTree()}
      </div>
      <div className="flex-1 bg-white border rounded p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
        {assets.length === 0 ? (
          <p className="text-neutral-500">Select a station to view assets</p>
        ) : (
          <ul className="divide-y">
            {assets.map((a) => (
              <li
                key={a.id}
                className="py-2 cursor-pointer hover:bg-neutral-50"
                onClick={() => {
                  setSelected(a);
                  setShowQR(false);
                }}
              >
                {a.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        {...(selected ? { title: selected.name } : {})}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowQR((s) => !s)}>
                {showQR ? 'Hide QR' : 'Show QR'}
              </Button>
              <Button variant="primary" onClick={() => setWoOpen(true)}>
                Create WO
              </Button>
            </div>
            {showQR && <AssetQRCode value={selected.qr} />}
            <div className="space-y-1 text-sm">
              {selected.location && <p>Location: {selected.location}</p>}
              {selected.serialNumber && <p>Serial: {selected.serialNumber}</p>}
              {selected.status && <p>Status: {selected.status}</p>}
            </div>
          </div>
        )}
      </Drawer>
      <WorkOrderModal
        isOpen={woOpen}
        onClose={() => setWoOpen(false)}
        workOrder={null}
        {...(selected ? { initialData: { assetId: selected.id } } : {})}
        onUpdate={async (payload) => {
          try {
            await http.post('/workorders', payload);
          } finally {
            setWoOpen(false);
          }
        }}
      />
    </div>
  );
};

export default Assets;

