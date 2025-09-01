import { Request, Response, NextFunction } from 'express';
import TimeSheet from '../models/TimeSheet';

export const getAllTimeSheets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await TimeSheet.find();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getTimeSheetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await TimeSheet.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createTimeSheet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newItem = new TimeSheet(req.body);
    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

export const updateTimeSheet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await TimeSheet.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteTimeSheet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await TimeSheet.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
