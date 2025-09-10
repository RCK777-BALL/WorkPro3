import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import PMTask from '../models/PMTask';

// Shared param type for routes with :id
interface IdParams { id: string }

export const getAllPMTasks: AuthedRequestHandler = async (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tasks = await PMTask.find({ tenantId: req.tenantId });
    res.json(tasks);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const getPMTaskById: AuthedRequestHandler<IdParams> = async (
  req: AuthedRequest<IdParams>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const task = await PMTask.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!task) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(task);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const createPMTask: AuthedRequestHandler<unknown, any, any> = async (
  req: AuthedRequest<unknown, any, any>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req as Request);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const payload = { ...req.body, tenantId: req.tenantId };
    const task = await PMTask.create(payload);
    res.status(201).json(task);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const updatePMTask: AuthedRequestHandler<IdParams, any, any> = async (
  req: AuthedRequest<IdParams, any, any>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req as Request);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const task = await PMTask.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true, runValidators: true },
    );
    if (!task) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(task);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const deletePMTask: AuthedRequestHandler<IdParams> = async (
  req: AuthedRequest<IdParams>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const task = await PMTask.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!task) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

