/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

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
  getAssetDetail,
} from './service';

type Maybe<T> = T | undefined;

const ensureTenant = (req: AuthedRequest, res: Response): Maybe<string> => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required', 400);
    return undefined;
  }
  return req.tenantId;
};

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

export const getHierarchy: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await fetchHierarchy(buildContext(req));
    send(res, data);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const getAssetDetails: AuthedRequestHandler<{ assetId: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
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
  if (!ensureTenant(req, res)) return;
  try {
    const department = await createDepartment(buildContext(req), {
      name: req.body.name,
      notes: req.body.notes,
      siteId: req.body.siteId,
    });
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
  if (!ensureTenant(req, res)) return;
  try {
    const department = await updateDepartment(buildContext(req), req.params.departmentId, req.body);
    send(res, department);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteDepartmentHandler: AuthedRequestHandler<{ departmentId: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
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
  if (!ensureTenant(req, res)) return;
  try {
    const line = await createLine(buildContext(req), req.body);
    send(res, line, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const updateLineHandler: AuthedRequestHandler<
  { lineId: string },
  unknown,
  { name?: string; notes?: string }
> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const line = await updateLine(buildContext(req), req.params.lineId, req.body);
    send(res, line);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteLineHandler: AuthedRequestHandler<{ lineId: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    await deleteLine(buildContext(req), req.params.lineId);
    send(res, { id: req.params.lineId });
  } catch (err) {
    handleError(err, res, next);
  }
};

export const createStationHandler: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  { name?: string; notes?: string; lineId?: string; siteId?: string }
> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const station = await createStation(buildContext(req), req.body);
    send(res, station, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const updateStationHandler: AuthedRequestHandler<
  { stationId: string },
  unknown,
  { name?: string; notes?: string }
> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const station = await updateStation(buildContext(req), req.params.stationId, req.body);
    send(res, station);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteStationHandler: AuthedRequestHandler<{ stationId: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    await deleteStation(buildContext(req), req.params.stationId);
    send(res, { id: req.params.stationId });
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
  if (!ensureTenant(req, res)) return;
  try {
    const asset = await createAsset(buildContext(req), req.body);
    send(res, asset, 201);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const updateAssetHandler: AuthedRequestHandler<{ assetId: string }, unknown, AssetBody> = async (
  req,
  res,
  next,
) => {
  if (!ensureTenant(req, res)) return;
  try {
    const asset = await updateAsset(buildContext(req), req.params.assetId, req.body);
    send(res, asset);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const deleteAssetHandler: AuthedRequestHandler<{ assetId: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    await deleteAsset(buildContext(req), req.params.assetId);
    send(res, { id: req.params.assetId });
  } catch (err) {
    handleError(err, res, next);
  }
};
