import { Request, Response, NextFunction } from 'express';
import PMTask from '../models/PMTask';
import { validationResult } from 'express-validator';

export const getAllPMTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await PMTask.find();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getPMTaskById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await PMTask.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createPMTask: AuthedRequestHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { active, ...rest } = req.body;
    const pmTaskData = {
      ...rest,
      isActive: active,
      tenantId: req.tenantId,
    };

    const newItem = new PMTask(pmTaskData);
    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

export const updatePMTask = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { active, ...rest } = req.body;
    const pmTaskData = {
      ...rest,
      isActive: active,
    };

    const updated = await PMTask.findByIdAndUpdate(req.params.id, pmTaskData, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deletePMTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await PMTask.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
