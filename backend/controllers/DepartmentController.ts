import Department from '../models/Department';

export const listDepartments: AuthedRequestHandler<unknown, any, unknown, { q?: string }> = async (
  req: AuthedRequest<unknown, any, unknown, { q?: string }>,
  res,
  next
) => {
  try {
    const filter: any = { tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
    if (q) filter.name = { $regex: new RegExp(q, 'i') };

    const items = await Department.find(filter).sort({ name: 1 });
    return res.json(items);
  } catch (err) {
    return next(err);
  }
};
