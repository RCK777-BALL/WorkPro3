import { Request, Response, NextFunction } from 'express';
import Department from '../models/Department';

export const getAllStations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const departments = await Department.find({ tenantId: (req as any).tenantId });
    const stations = departments.flatMap((dep) =>
      dep.lines.flatMap((line) =>
        line.stations.map((s) => ({ ...s.toObject(), lineId: line._id, departmentId: dep._id }))
      )
    );
    res.json(stations);
  } catch (err) {
    next(err);
  }
};

export const getStationById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const department = await Department.findOne({
      'lines.stations._id': req.params.id,
      tenantId: (req as any).tenantId,
    });
    if (!department) return res.status(404).json({ message: 'Not found' });
    let station;
    department.lines.forEach((line) => {
      const s = line.stations.id(req.params.id);
      if (s) station = s;
    });
    if (!station) return res.status(404).json({ message: 'Not found' });
    res.json(station);
  } catch (err) {
    next(err);
  }
};

export const createStation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { lineId, name } = req.body;
    const department = await Department.findOne({
      'lines._id': lineId,
      tenantId: (req as any).tenantId,
    });
    if (!department) return res.status(404).json({ message: 'Line not found' });
    const line = department.lines.id(lineId);
    if (!line) return res.status(404).json({ message: 'Line not found' });
    line.stations.push({ name, tenantId: (req as any).tenantId });
    await department.save();
    res.status(201).json(line.stations[line.stations.length - 1]);
  } catch (err) {
    next(err);
  }
};

export const updateStation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const department = await Department.findOne({
      'lines.stations._id': req.params.id,
      tenantId: (req as any).tenantId,
    });
    if (!department) return res.status(404).json({ message: 'Not found' });
    for (const line of department.lines) {
      const station = line.stations.id(req.params.id);
      if (station) {
        station.set(req.body);
        await department.save();
        return res.json(station);
      }
    }
    res.status(404).json({ message: 'Not found' });
  } catch (err) {
    next(err);
  }
};

export const deleteStation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const department = await Department.findOne({
      'lines.stations._id': req.params.id,
      tenantId: (req as any).tenantId,
    });
    if (!department) return res.status(404).json({ message: 'Not found' });
    for (const line of department.lines) {
      const station = line.stations.id(req.params.id);
      if (station) {
        station.deleteOne();
        await department.save();
        return res.json({ message: 'Deleted successfully' });
      }
    }
    res.status(404).json({ message: 'Not found' });
  } catch (err) {
    next(err);
  }
};

export const getStationsByLine = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const department = await Department.findOne({
      'lines._id': req.params.lineId,
      tenantId: (req as any).tenantId,
    });
    if (!department) return res.status(404).json({ message: 'Not found' });
    const line = department.lines.id(req.params.lineId);
    if (!line) return res.status(404).json({ message: 'Not found' });
    res.json(line.stations);
  } catch (err) {
    next(err);
  }
};
