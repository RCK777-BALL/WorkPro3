import { Request, Response, NextFunction } from 'express';

import TimeSheet from '../models/TimeSheet';

 export const getAllTimeSheets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
 
  try {
    const items = await TimeSheet.find();
    res.json(items);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const getTimeSheetById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const item = await TimeSheet.findById(req.params.id);
    if (!item) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(item);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const createTimeSheet = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const newItem = new TimeSheet(req.body);
    const saved = await newItem.save();
    res.status(201).json(saved);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const updateTimeSheet = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const updated = await TimeSheet.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(updated);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const deleteTimeSheet = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const deleted = await TimeSheet.findByIdAndDelete(req.params.id);
    if (!deleted) {
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
