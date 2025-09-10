import { Request, Response, NextFunction } from 'express';
import Meter from '../models/Meter';
import MeterReading from '../models/MeterReading';

export const getMeters = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filter: any = { tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    if (req.query.asset) filter.asset = req.query.asset;
    const meters = await Meter.find(filter);
    res.json(meters);
  } catch (err) {
    next(err);
  }
};

export const getMeterById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filter: any = { _id: req.params.id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const meter = await Meter.findOne(filter);
    if (!meter) return res.status(404).json({ message: 'Not found' });
    res.json(meter);
  } catch (err) {
    next(err);
  }
};

export const createMeter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const meter = await Meter.create({
      ...req.body,
      tenantId: req.tenantId,
      siteId: req.siteId,
    });
    res.status(201).json(meter);
  } catch (err) {
    next(err);
  }
};

export const updateMeter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filter: any = { _id: req.params.id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const meter = await Meter.findOneAndUpdate(filter, req.body, { new: true });
    if (!meter) return res.status(404).json({ message: 'Not found' });
    res.json(meter);
  } catch (err) {
    next(err);
  }
};

export const deleteMeter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filter: any = { _id: req.params.id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const meter = await Meter.findOneAndDelete(filter);
    if (!meter) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const addMeterReading = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filter: any = { _id: req.params.id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const meter = await Meter.findOne(filter);
    if (!meter) return res.status(404).json({ message: 'Not found' });

    const reading = await MeterReading.create({
      meter: meter._id,
      value: req.body.value,
      tenantId: req.tenantId,
      siteId: req.siteId,
    });
    meter.currentValue = req.body.value;
    await meter.save();
    res.status(201).json(reading);
  } catch (err) {
    next(err);
  }
};

export const getMeterReadings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filter: any = { _id: req.params.id, tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;
    const meter = await Meter.findOne(filter);
    if (!meter) return res.status(404).json({ message: 'Not found' });
    const readingFilter: any = { meter: meter._id, tenantId: req.tenantId };
    if (req.siteId) readingFilter.siteId = req.siteId;
    const readings = await MeterReading.find(readingFilter)
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(readings);
  } catch (err) {
    next(err);
  }
};
