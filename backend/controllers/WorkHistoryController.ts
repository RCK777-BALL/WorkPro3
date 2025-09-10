import { Request, Response, NextFunction } from 'express';

import WorkHistory from '../models/WorkHistory';

export const getAllWorkHistories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await WorkHistory.find();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getWorkHistoryById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await WorkHistory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createWorkHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newItem = new WorkHistory(req.body);
    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

export const updateWorkHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await WorkHistory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteWorkHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await WorkHistory.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
