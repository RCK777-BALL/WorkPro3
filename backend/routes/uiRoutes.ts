import { Router } from 'express';

const router = Router();

router.get('/workorders', (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);
  const query = String(req.query.q ?? '').toLowerCase();
  const status = String(req.query.status ?? '');
  const all = mockWorkOrders().filter(
    (workOrder) =>
      (!query || workOrder.title.toLowerCase().includes(query)) &&
      (!status || workOrder.status === status)
  );
  const start = (page - 1) * pageSize;
  res.json({ items: all.slice(start, start + pageSize), total: all.length });
});

router.post('/workorders', (req, res) => {
  const { title, asset, priority, dueDate, description } = req.body;
  const workOrder = {
    id: Date.now().toString(),
    title,
    asset,
    priority,
    status: 'Open',
    dueDate,
    description,
    createdAt: new Date().toISOString(),
  };

  console.log('New Work Order:', workOrder);

  res.status(201).json(workOrder);
});

router.put('/workorders/:id', (req, res) => {
  res.json({ id: req.params.id, ...req.body });
});

router.get('/permits', (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);
  const query = String(req.query.q ?? '').toLowerCase();
  const status = String(req.query.status ?? '');
  const all = mockPermits().filter(
    (permit) =>
      (!query ||
        permit.requester.toLowerCase().includes(query) ||
        permit.type.toLowerCase().includes(query)) &&
      (!status || permit.status === status)
  );
  const start = (page - 1) * pageSize;
  res.json({ items: all.slice(start, start + pageSize), total: all.length });
});

router.post('/permits/:id/decision', (req, res) => {
  res.json({
    id: req.params.id,
    decision: req.body.decision,
    notes: req.body.notes,
  });
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

function mockWorkOrders() {
  const base = [
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

  return base as any[];
}

function mockPermits() {
  const base = [
    { id: 'p1', type: 'Hot Work', requester: 'J. Smith', status: 'Pending', createdAt: offsetDays(-1) },
    { id: 'p2', type: 'Confined Space', requester: 'L. Brown', status: 'Approved', createdAt: offsetDays(-3) },
    { id: 'p3', type: 'Electrical', requester: 'A. Patel', status: 'Rejected', createdAt: offsetDays(-2) },
  ];

  return base as any[];
}

function offsetDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export default router;
