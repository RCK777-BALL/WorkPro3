import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import PMTask from '../models/PMTask';
import type { AuthedRequestHandler } from '../types/http';

export const getAllPMTasks: AuthedRequestHandler = async (req, res, next) => {
  try {
     const filter: Record<string, unknown> = { tenantId: req.tenantId };
    const tasks = await PMTask.find(filter);
    res.json(tasks);
    return;
 
  } catch (err) {
    return next(err);
  }
};

export const getPMTaskById: AuthedRequestHandler = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'Invalid ID' });
      return;
    }

     const task = await PMTask.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'Invalid ID' });
      return;
    }
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'Invalid ID' });
      return;
    }
    const task = await PMTask.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
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

export {
  getAllPMTasks,
  getPMTaskById,
  createPMTask,
  updatePMTask,
  deletePMTask,
};

