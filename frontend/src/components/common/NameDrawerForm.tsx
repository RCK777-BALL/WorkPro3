import { useEffect, useState } from 'react';
import Button from './Button';
import Drawer from '../ui/Drawer';

interface Props {
  open: boolean;
  title: string;
  initialName?: string;
  initialAssets?: number;
  showAssetInput?: boolean;
  onSubmit: (values: { name: string; assets?: number }) => void;
  onCancel: () => void;
}

export default function NameDrawerForm({
  open,
  title,
  initialName = '',
  initialAssets = 0,
  showAssetInput = false,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialName);
  const [assets, setAssets] = useState(initialAssets);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setAssets(initialAssets);
    }
  }, [open, initialName, initialAssets]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), assets });
  };

  return (
    <Drawer open={open} onClose={onCancel} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        {showAssetInput && (
          <div>
            <label className="block text-sm font-medium mb-1">Asset Count</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
              value={assets}
              onChange={(e) => setAssets(Number(e.target.value))}
              min={0}
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
