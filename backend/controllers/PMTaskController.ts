import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import PMTask from '../models/PMTask';
import type { AuthedRequestHandler } from '../types/http';

// Shared param type for routes with :id
interface IdParams { id: string }

export const getAllPMTasks: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filter: any = { tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const tasks = await PMTask.find(filter);
    return res.json(tasks);
  } catch (err) {
    return next(err);
  }
};

export const getPMTaskById: AuthedRequestHandler = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const filter: any = { _id: req.params.id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const task = await PMTask.findOne(filter);
    if (!task) return res.status(404).json({ message: 'Not found' });
    return res.json(task);
  } catch (err) {
    return next(err);
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
    return next(err);
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
    return next(err);
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
    return next(err);
  }
};

