import { Router } from 'express';

interface MockWorkOrder {
  id: string;
  title: string;
  asset?: string;
  priority: string;
  status: string;
  dueDate?: string;
  description?: string;
  createdAt: string;
}

interface MockPermit {
  id: string;
  type: 'Hot Work' | 'Confined Space' | 'Electrical' | 'Work at Height';
  requester: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  notes?: string;
}

const router = Router();

const workOrders: MockWorkOrder[] = mockWorkOrders();
const permits: MockPermit[] = mockPermits();

router.get('/workorders', (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);
  const query = String(req.query.q ?? '').toLowerCase();
  const status = String(req.query.status ?? '');
  const all = workOrders.filter(
      (workOrder) =>
        (!query || workOrder.title.toLowerCase().includes(query)) &&
        (!status || workOrder.status === status)
  );
  const start = (page - 1) * pageSize;
  res.json({ items: all.slice(start, start + pageSize), total: all.length });
});

router.post('/workorders', (req, res) => {
  const { title, asset, priority, dueDate, description, status } = req.body;
  const workOrder: MockWorkOrder = {
    id: Date.now().toString(),
    title,
    asset,
    priority,
    status: status ?? 'Open',
    dueDate,
    description,
    createdAt: new Date().toISOString(),
  };

  workOrders.unshift(workOrder);

  res.status(201).json(workOrder);
});

router.put('/workorders/:id', (req, res) => {
  const index = workOrders.findIndex((workOrder) => workOrder.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ message: 'Work order not found' });
    return;
  }

  workOrders[index] = { ...workOrders[index], ...req.body };

  res.json(workOrders[index]);
});

router.get('/permits', (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);
  const query = String(req.query.q ?? '').toLowerCase();
  const status = String(req.query.status ?? '');
  const all = permits.filter(
    (permit) =>
      (!query ||
        permit.requester.toLowerCase().includes(query) ||
        permit.type.toLowerCase().includes(query)) &&
      (!status || permit.status === status)
  );
  const start = (page - 1) * pageSize;
  res.json({ items: all.slice(start, start + pageSize), total: all.length });
});

router.post('/permits', (req, res) => {
  const { type, requester, status, notes } = req.body as Partial<MockPermit>;

  const permit: MockPermit = {
    id: Date.now().toString(),
    type: type ?? 'Hot Work',
    requester: requester ?? 'Unknown',
    status: (status as MockPermit['status']) ?? 'Pending',
    notes,
    createdAt: new Date().toISOString(),
  };

  permits.unshift(permit);

  res.status(201).json(permit);
});

router.put('/permits/:id', (req, res) => {
  const index = permits.findIndex((permit) => permit.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ message: 'Permit not found' });
    return;
  }

  permits[index] = {
    ...permits[index],
    ...req.body,
  };

  res.json(permits[index]);
});

router.delete('/permits/:id', (req, res) => {
  const index = permits.findIndex((permit) => permit.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ message: 'Permit not found' });
    return;
  }

  const [removed] = permits.splice(index, 1);

  res.json(removed);
});

router.post('/permits/:id/decision', (req, res) => {
  const permit = permits.find((item) => item.id === req.params.id);

  if (!permit) {
    res.status(404).json({ message: 'Permit not found' });
    return;
  }

  const decision = req.body.decision as MockPermit['status'];

  if (decision === 'Approved' || decision === 'Rejected') {
    permit.status = decision;
  }

  if (typeof req.body.notes === 'string') {
    permit.notes = req.body.notes;
  }

  res.json(permit);
});

router.get('/analytics/kpis', (_req, res) => {
  res.json({ completionRate: 87, mttr: 3.2, backlog: 42 });
});

router.get('/analytics/trends', (_req, res) => {
  const today = new Date();
  const data = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));
    const created = 5 + Math.floor(Math.random() * 6);
    const completed = 4 + Math.floor(Math.random() * 6);
    return {
      date: date.toISOString().slice(5, 10),
      created,
      completed,
    };
  });
  res.json(data);
});

function mockWorkOrders(): MockWorkOrder[] {
  const base: MockWorkOrder[] = [
    {
      id: 'wo1',
      title: 'Replace belt on Line 3',
      asset: 'Conveyor L3',
      priority: 'High',
      status: 'Open',
      dueDate: offsetDays(2),
      createdAt: offsetDays(-1),
    },
    {
      id: 'wo2',
      title: 'Lubricate bearing M7',
      asset: 'Motor M7',
      priority: 'Medium',
      status: 'In Progress',
      dueDate: offsetDays(5),
      createdAt: offsetDays(-2),
    },
    {
      id: 'wo3',
      title: 'PLC Fault Investigation',
      asset: 'Press A1',
      priority: 'Critical',
      status: 'On Hold',
      dueDate: offsetDays(1),
      createdAt: offsetDays(-4),
    },
    {
      id: 'wo4',
      title: 'Replace filters AHU-2',
      asset: 'AHU-2',
      priority: 'Low',
      status: 'Completed',
      dueDate: offsetDays(-1),
      createdAt: offsetDays(-6),
    },
  ];

  return base;
}

function mockPermits(): MockPermit[] {
  return [
    { id: 'p1', type: 'Hot Work', requester: 'J. Smith', status: 'Pending', createdAt: offsetDays(-1) },
    { id: 'p2', type: 'Confined Space', requester: 'L. Brown', status: 'Approved', createdAt: offsetDays(-3) },
    { id: 'p3', type: 'Electrical', requester: 'A. Patel', status: 'Rejected', createdAt: offsetDays(-2) },
  ];
}

function offsetDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export default router;
