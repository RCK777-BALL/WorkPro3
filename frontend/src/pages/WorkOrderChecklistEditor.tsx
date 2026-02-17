import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkOrders } from '../api/useWorkOrders';

interface ChecklistItem {
  id: string;
  text: string;
  type: 'checkbox' | 'numeric' | 'text';
  required?: boolean;
  completedValue?: string | number | boolean;
}

export default function WorkOrderChecklistEditor() {
  const { id } = useParams<{ id: string }>();
  const { updateChecklist } = useWorkOrders();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [text, setText] = useState('');
  const [type, setType] = useState<ChecklistItem['type']>('checkbox');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addItem = () => {
    if (!text.trim()) return;
    setItems((prev) => [...prev, { id: crypto.randomUUID(), text, type, required: false }]);
    setText('');
  };

  const save = async () => {
    if (!id) return;
    setError(null);
    setSuccess(false);
    try {
      await updateChecklist(id, items);
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Checklist Builder</h1>
      <div className="flex gap-2 mb-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 border rounded p-2"
          placeholder="Checklist item"
        />
        <select value={type} onChange={(e) => setType(e.target.value as ChecklistItem['type'])} className="border p-2 rounded">
          <option value="checkbox">Checkbox</option>
          <option value="numeric">Numeric</option>
          <option value="text">Text</option>
        </select>
        <button className="bg-gray-800 text-[var(--wp-color-text)] px-3 rounded" onClick={addItem} type="button">
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="border rounded p-2 flex items-center justify-between">
            <span>{item.text}</span>
            <button
              className="text-red-600"
              onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
              type="button"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button className="mt-4 bg-[var(--wp-color-primary)] text-[var(--wp-color-text)] px-4 py-2 rounded" onClick={save} type="button">
        Save Checklist
      </button>
      {success && <p className="text-green-600 mt-2">Saved!</p>}
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}

