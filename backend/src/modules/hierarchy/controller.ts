/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import Department from '../../../models/Department';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import {
  HierarchyError,
  fetchHierarchy,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createLine,
  updateLine,
  deleteLine,
  createStation,
  updateStation,
  deleteStation,
  createAsset,
  updateAsset,
  deleteAsset,
  duplicateAsset,
  getAssetDetail,
} from './service';

const send = (res: Response, data: unknown, status = 200) => {
  res.status(status).json({ success: true, data });
};

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof HierarchyError) {
    fail(res, err.message, err.status);
    return;
  }
  next(err);
};

const buildContext = (req: AuthedRequest) => ({
  tenantId: req.tenantId!,
  plantId: req.plantId,
  siteId: req.siteId,
});

const mapDepartment = (department: typeof Department.prototype) => {
  type StationDoc = { _id: { toString(): string }; name: string; notes?: string };
  type LineDoc = { _id: { toString(): string }; name: string; notes?: string; stations?: StationDoc[] };

  const legacyDescription = (department as { description?: string }).description;
  return {
    _id: department._id.toString(),
    name: department.name,
    description: department.notes ?? legacyDescription,
    notes: department.notes ?? legacyDescription,
    plant: department.plant?.toString(),
    lines: (department.lines ?? []).map((line: LineDoc) => ({
      _id: line._id.toString(),
      name: line.name,
      description: line.notes ?? '',
      notes: line.notes ?? '',
      stations: (line.stations ?? []).map((station: StationDoc) => ({
        _id: station._id.toString(),
        name: station.name,
        description: station.notes ?? '',
        notes: station.notes ?? '',
        assets: [],
      })),
    })),
  };
};

const sendDepartment = async (
  context: ReturnType<typeof buildContext>,
  departmentId: string,
  res: Response,
  status = 200,
) => {
  const department = await Department.findOne({ _id: departmentId, tenantId: context.tenantId });
  if (!department) {
    fail(res, 'Department not found', 404);
    return;
  }
  send(res, mapDepartment(department), status);
};

export const getHierarchy: AuthedRequestHandler = async (req, res, next) => {
  try {
    const data = await fetchHierarchy(buildContext(req));
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const getAssetDetails: AuthedRequestHandler<{ assetId: string }> = async (req, res, next) => {
  try {
    const data = await getAssetDetail(buildContext(req), req.params.assetId);
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createDepartmentHandler: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  { name?: string; notes?: string; siteId?: string }
> = async (
  req,
  res,
  next,
) => {
  try {
    const payload: { name?: string; notes?: string; siteId?: string } = {};
    if (req.body.name !== undefined) payload.name = req.body.name;
    if (req.body.notes !== undefined) payload.notes = req.body.notes;
    if (req.body.siteId !== undefined) payload.siteId = req.body.siteId;

    const department = await createDepartment(buildContext(req), payload);
    send(res, department, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const updateDepartmentHandler: AuthedRequestHandler<
  { departmentId: string },
  unknown,
  { name?: string; notes?: string }
> = async (req, res, next) => {
  try {
    const department = await updateDepartment(buildContext(req), req.params.departmentId, req.body);
    send(res, department);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteDepartmentHandler: AuthedRequestHandler<{ departmentId: string }> = async (req, res, next) => {
  try {
    await deleteDepartment(buildContext(req), req.params.departmentId);
    send(res, { id: req.params.departmentId });
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createLineHandler: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  { name?: string; notes?: string; departmentId?: string; siteId?: string }
> = async (req, res, next) => {
  try {
    const line = await createLine(buildContext(req), req.body);
    send(res, line, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createLineForDepartmentHandler: AuthedRequestHandler<
  { departmentId: string },
  unknown,
  { name?: string; notes?: string; siteId?: string }
> = async (req, res, next) => {
  try {
    await createLine(buildContext(req), { ...req.body, departmentId: req.params.departmentId });
    await sendDepartment(buildContext(req), req.params.departmentId, res, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const updateLineHandler: AuthedRequestHandler<
  { lineId: string },
  unknown,
  { name?: string; notes?: string }
> = async (req, res, next) => {
  try {
    const line = await updateLine(buildContext(req), req.params.lineId, req.body);
    send(res, line);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const updateLineForDepartmentHandler: AuthedRequestHandler<
  { departmentId: string; lineId: string },
  unknown,
  { name?: string; notes?: string }
> = async (req, res, next) => {
  try {
    await updateLine(buildContext(req), req.params.lineId, req.body);
    await sendDepartment(buildContext(req), req.params.departmentId, res);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteLineHandler: AuthedRequestHandler<{ lineId: string }> = async (req, res, next) => {
  try {
    await deleteLine(buildContext(req), req.params.lineId);
    send(res, { id: req.params.lineId });
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteLineForDepartmentHandler: AuthedRequestHandler<
  { departmentId: string; lineId: string }
> = async (req, res, next) => {
  try {
    await deleteLine(buildContext(req), req.params.lineId);
    await sendDepartment(buildContext(req), req.params.departmentId, res);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createStationHandler: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  { name?: string; notes?: string; lineId?: string; siteId?: string }
> = async (req, res, next) => {
  try {
    const station = await createStation(buildContext(req), req.body);
    send(res, station, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createStationForLineHandler: AuthedRequestHandler<
  { departmentId: string; lineId: string },
  unknown,
  { name?: string; notes?: string; siteId?: string }
> = async (req, res, next) => {
  try {
    await createStation(buildContext(req), { ...req.body, lineId: req.params.lineId });
    await sendDepartment(buildContext(req), req.params.departmentId, res, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const updateStationHandler: AuthedRequestHandler<
  { stationId: string },
  unknown,
  { name?: string; notes?: string }
> = async (req, res, next) => {
  try {
    const station = await updateStation(buildContext(req), req.params.stationId, req.body);
    send(res, station);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const updateStationForLineHandler: AuthedRequestHandler<
  { departmentId: string; lineId: string; stationId: string },
  unknown,
  { name?: string; notes?: string }
> = async (req, res, next) => {
  try {
    await updateStation(buildContext(req), req.params.stationId, req.body);
    await sendDepartment(buildContext(req), req.params.departmentId, res);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteStationHandler: AuthedRequestHandler<{ stationId: string }> = async (req, res, next) => {
  try {
    await deleteStation(buildContext(req), req.params.stationId);
    send(res, { id: req.params.stationId });
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteStationForLineHandler: AuthedRequestHandler<
  { departmentId: string; lineId: string; stationId: string }
> = async (req, res, next) => {
  try {
    await deleteStation(buildContext(req), req.params.stationId);
    await sendDepartment(buildContext(req), req.params.departmentId, res);
  } catch (err) {
    handleError(err, res, next);
  }
};

type AssetBody = {
  name?: string;
  type?: 'Electrical' | 'Mechanical' | 'Tooling' | 'Interface';
  status?: string;
  notes?: string;
  description?: string;
  location?: string;
  serialNumber?: string;
  modelName?: string;
  manufacturer?: string;
  criticality?: string;
  departmentId?: string;
  lineId?: string;
  stationId?: string;
};

export const createAssetHandler: AuthedRequestHandler<ParamsDictionary, unknown, AssetBody> = async (req, res, next) => {
  try {
    const asset = await createAsset(buildContext(req), req.body);
    send(res, asset, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createAssetForStationHandler: AuthedRequestHandler<
  { departmentId: string; lineId: string; stationId: string },
  unknown,
  AssetBody
> = async (req, res, next) => {
  try {
    await createAsset(buildContext(req), { ...req.body, stationId: req.params.stationId });
    await sendDepartment(buildContext(req), req.params.departmentId, res, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const updateAssetHandler: AuthedRequestHandler<{ assetId: string }, unknown, AssetBody> = async (
  req,
  res,
  next,
) => {
  try {
    const asset = await updateAsset(buildContext(req), req.params.assetId, req.body);
    send(res, asset);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const updateAssetForStationHandler: AuthedRequestHandler<
  { departmentId: string; lineId: string; stationId: string; assetId: string },
  unknown,
  AssetBody
> = async (req, res, next) => {
  try {
    await updateAsset(buildContext(req), req.params.assetId, req.body);
    await sendDepartment(buildContext(req), req.params.departmentId, res);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteAssetHandler: AuthedRequestHandler<{ assetId: string }> = async (req, res, next) => {
  try {
    await deleteAsset(buildContext(req), req.params.assetId);
    send(res, { id: req.params.assetId });
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteAssetForStationHandler: AuthedRequestHandler<
  { departmentId: string; lineId: string; stationId: string; assetId: string }
> = async (req, res, next) => {
  try {
    await deleteAsset(buildContext(req), req.params.assetId);
    await sendDepartment(buildContext(req), req.params.departmentId, res);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const duplicateAssetHandler: AuthedRequestHandler<{ assetId: string }, unknown, { name?: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const payload: { name?: string } = {};
    if (req.body.name !== undefined) payload.name = req.body.name;
    const asset = await duplicateAsset(buildContext(req), req.params.assetId, payload);
    send(res, asset, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};
