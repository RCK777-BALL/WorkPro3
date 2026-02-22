/*
 * SPDX-License-Identifier: MIT
 */

import { type Request, type Response, type NextFunction } from 'express';

import { sendResponse } from '../utils';
import {
  VendorNotFoundError,
  createVendor,
  deleteVendor,
  getVendor,
  listVendors,
  updateVendor,
  type VendorInput,
} from '../services/vendorService';

const parseVendorInput = (body: any): { data?: VendorInput; error?: string } => {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return { error: 'Vendor name is required' };
  }

  const payload: VendorInput = { name };
  if (typeof body.email === 'string' && body.email.trim()) payload.email = body.email.trim();
  if (typeof body.phone === 'string' && body.phone.trim()) payload.phone = body.phone.trim();

  return { data: payload };
};

export const getAllVendors = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    if (!req.tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const vendors = await listVendors(req.tenantId);
    return sendResponse(res, vendors);
  } catch (err) {
    next(err);
  }
};

export const getVendorById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;

    if (!req.tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const vendor = await getVendor(req.tenantId, id);
    return sendResponse(res, vendor);
  } catch (err) {
    if (err instanceof VendorNotFoundError) {
      return sendResponse(res, null, err.message, 404);
    }
    next(err);
  }
};

export const createVendorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const { data, error } = parseVendorInput(req.body);
    if (error || !data) return sendResponse(res, null, error ?? 'Invalid input', 400);
    if (!req.tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const vendor = await createVendor(req.tenantId, data);
    return sendResponse(res, vendor, null, 201);
  } catch (err) {
    next(err);
  }
};

export const updateVendorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;
    const { data, error } = parseVendorInput(req.body);
    if (error || !data) return sendResponse(res, null, error ?? 'Invalid input', 400);
    if (!req.tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    const vendor = await updateVendor(req.tenantId, id, data);
    return sendResponse(res, vendor);
  } catch (err) {
    if (err instanceof VendorNotFoundError) {
      return sendResponse(res, null, err.message, 404);
    }
    next(err);
  }
};

export const deleteVendorHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;
    if (!req.tenantId) return sendResponse(res, null, 'Tenant ID required', 400);
    await deleteVendor(req.tenantId, id);
    return sendResponse(res, { message: 'Deleted successfully' });
  } catch (err) {
    if (err instanceof VendorNotFoundError) {
      return sendResponse(res, null, err.message, 404);
    }
    next(err);
  }
};

export default {
  getAllVendors,
  getVendorById,
  createVendorHandler,
  updateVendorHandler,
  deleteVendorHandler,
};
