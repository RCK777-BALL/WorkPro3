/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import PMTask from '../models/PMTask';
import type { AuthedRequestHandler } from '../types/http';

export const getAllPMTasks: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filter: Record<string, unknown> = { tenantId: req.tenantId };
    if (req.siteId) (filter as any).siteId = req.siteId;

    const tasks = await PMTask.find(filter);
    res.json(tasks);
  } catch (err) {
    next(err);
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
  } catch (err) {
    next(err);
  }
};

export const createPMTask: AuthedRequestHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req as any);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const payload = { ...req.body, tenantId: req.tenantId, siteId: req.siteId };
    const task = await PMTask.create(payload);
    res.status(201).json(task);
  } catch (err) {
    next(err);
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
  } catch (err) {
    next(err);
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
  } catch (err) {
    next(err);
  }
};
