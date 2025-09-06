import { useEffect, useState } from 'react';
import type { Department, DepartmentPayload, Line } from '../../api/departments';

type Props = {
  initial: Department | null;
  onSubmit: (payload: DepartmentPayload, draftLines: Line[]) => Promise<void>;
  onCancel: () => void;
};

export default function DepartmentDrawerForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  // the rest of code exactly as provided by user...
}
