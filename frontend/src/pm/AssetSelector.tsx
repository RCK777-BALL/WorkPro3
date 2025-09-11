import React, { useEffect, useState } from 'react';
import http from '@/lib/http';

interface Asset {
  _id: string;
  name: string;
}

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
}

const AssetSelector: React.FC<Props> = ({ value, onChange }) => {
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await http.get('/assets', { withCredentials: true });
        setAssets(res.data as Asset[]);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter(a => a !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="space-y-2">
      {assets.map(a => (
        <label key={a._id} className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={value.includes(a._id)}
            onChange={() => toggle(a._id)}
          />
          <span>{a.name}</span>
        </label>
      ))}
      {assets.length === 0 && (
        <p className="text-sm text-neutral-500">No assets</p>
      )}
    </div>
  );
};

export default AssetSelector;
