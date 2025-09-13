/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import PMTask from '../models/PMTask';
import WorkOrder from '../models/WorkOrder';
import Meter from '../models/Meter';
import { nextCronOccurrenceWithin } from '../services/PMScheduler';
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

export const generatePMWorkOrders: AuthedRequestHandler = async (req, res, next) => {
  try {
    const now = new Date();
    const tasks = await PMTask.find({ tenantId: req.tenantId, active: true });
    let count = 0;
    for (const task of tasks) {
      if (task.rule?.type === 'calendar' && task.rule.cron) {
        const next = nextCronOccurrenceWithin(task.rule.cron, now, 7);
        if (next) {
          await WorkOrder.create({
            title: `PM: ${task.title}`,
            description: task.notes || '',
            status: 'open',
            asset: task.asset,
            pmTask: task._id,
            department: task.department,
            dueDate: next,
            priority: 'medium',
            tenantId: task.tenantId,
          });
          task.lastGeneratedAt = now;
          await task.save();
          count++;
        }
      } else if (task.rule?.type === 'meter' && task.rule.meterName) {
        const meter = await Meter.findOne({
          name: task.rule.meterName,
          tenantId: task.tenantId,
        });
        if (!meter) continue;
        const sinceLast = meter.currentValue - (meter.lastWOValue || 0);
        if (sinceLast >= (task.rule.threshold || 0)) {
          await WorkOrder.create({
            title: `Meter PM: ${task.title}`,
            description: task.notes || '',
            status: 'open',
            asset: meter.asset,
            pmTask: task._id,
            department: task.department,
            dueDate: now,
            priority: 'medium',
            tenantId: task.tenantId,
          });
          meter.lastWOValue = meter.currentValue;
          await meter.save();
          task.lastGeneratedAt = now;
          await task.save();
          count++;
        }
      }
    }
    res.json({ generated: count });
  } catch (err) {
    next(err);
  }
};
