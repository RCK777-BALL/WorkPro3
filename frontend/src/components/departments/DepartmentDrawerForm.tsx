import { useState } from 'react';
import type { Department, DepartmentPayload, Line } from '../../api/departments';
import Button from '../common/Button';

interface Props {
  initial: Department | null;
  onSubmit: (payload: DepartmentPayload, draftLines: Line[]) => Promise<void>;
  onCancel: () => void;
}

export default function DepartmentDrawerForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [lines, setLines] = useState<Line[]>(initial?.lines ?? []);

  const handleLineChange = (index: number, value: string) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, name: value } : l)));
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      { _id: Date.now().toString(), name: '', stations: [] },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ name: name.trim() }, lines);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {lines.map((line, index) => (
          <div key={line._id} className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-md"
              value={line.name}
              onChange={(e) => handleLineChange(index, e.target.value)}
            />
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => handleRemoveLine(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button type="button" variant="ghost" onClick={handleAddLine}>
          Add Line
        </Button>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save
        </Button>
      </div>
    </form>
  );
}

