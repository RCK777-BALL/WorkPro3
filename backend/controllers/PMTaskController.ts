import { validationResult } from 'express-validator';
import PMTask from '../models/PMTask';
import type { AuthedRequestHandler } from '../types/http';

// Shared param type for routes with :id
interface IdParams { id: string }

export const getAllPMTasks: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tasks = await PMTask.find({ tenantId: req.tenantId });
    res.json(tasks);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const getPMTaskById: AuthedRequestHandler = async (req, res, next) => {
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

export const createPMTask: AuthedRequestHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req as any);
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

export const updatePMTask: AuthedRequestHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req as any);
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

export const deletePMTask: AuthedRequestHandler = async (req, res, next) => {
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

