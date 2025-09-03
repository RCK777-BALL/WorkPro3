import { Request, Response, NextFunction } from 'express';
import Department from '../models/Department';

export const getAllLines = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const lines = await Department.aggregate([
      { $match: { tenantId: (req as any).tenantId } },
      { $unwind: '$lines' },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$lines',
              { departmentId: '$_id' },
            ],
          },
        },
      },
    ]).exec();
    res.json(lines);
  } catch (err) {
    next(err);
  }
};

export const getLineById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const department = await Department.findOne({
      'lines._id': req.params.id,
      tenantId: (req as any).tenantId,
    });
    if (!department) return res.status(404).json({ message: 'Not found' });
    const line = department.lines.id(req.params.id);
    if (!line) return res.status(404).json({ message: 'Not found' });
    res.json(line);
  } catch (err) {
    next(err);
  }
};

export const createLine = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { departmentId, name } = req.body;
    const department = await Department.findOne({
      _id: departmentId,
      tenantId: (req as any).tenantId,
    });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    department.lines.push({ name, tenantId: (req as any).tenantId, stations: [] });
    await department.save();
    res.status(201).json(department.lines[department.lines.length - 1]);
  } catch (err) {
    next(err);
  }
};

export const updateLine = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const department = await Department.findOne({
      'lines._id': req.params.id,
      tenantId: (req as any).tenantId,
    });
    if (!department) return res.status(404).json({ message: 'Not found' });
    const line = department.lines.id(req.params.id);
    if (!line) return res.status(404).json({ message: 'Not found' });
    line.set(req.body);
    await department.save();
    res.json(line);
  } catch (err) {
    next(err);
  }
};

export const deleteLine = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const department = await Department.findOne({
      'lines._id': req.params.id,
      tenantId: (req as any).tenantId,
    });
    if (!department) return res.status(404).json({ message: 'Not found' });
    const line = department.lines.id(req.params.id);
    if (!line) return res.status(404).json({ message: 'Not found' });
    line.deleteOne();
    await department.save();
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const getLinesByDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const department = await Department.findOne({
      _id: req.params.departmentId,
      tenantId: (req as any).tenantId,
    });
    if (!department) return res.status(404).json({ message: 'Not found' });
    res.json(department.lines);
  } catch (err) {
    next(err);
  }
};

export const getLineHierarchy = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const department = await Department.findOne({
      'lines._id': req.params.id,
      tenantId: (req as any).tenantId,
    });
    if (!department) return res.status(404).json({ message: 'Not found' });
    const line = department.lines.id(req.params.id);
    if (!line) return res.status(404).json({ message: 'Not found' });
    res.json(line);
  } catch (err) {
    next(err);
  }
};
