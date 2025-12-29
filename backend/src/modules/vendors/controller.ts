/*
 * SPDX-License-Identifier: MIT
 */

import type { NextFunction, Response } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { vendorInputSchema } from './schemas';
import { createVendor, getVendor, listVendors, updateVendor, type VendorInput } from './service';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    res.status(400).json({ error: 'Tenant context required' });
    return false;
  }
  return true;
};

const handleError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof Error) {
    res.status(400).json({ error: error.message });
    return;
  }
  next(error);
};

const buildContext = (req: AuthedRequest) => ({ tenantId: req.tenantId! });

export const listVendorsHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listVendors(buildContext(req));
    res.json(data);
  } catch (error) {
    handleError(error, res, next);
  }
};

export const getVendorHandler: AuthedRequestHandler<{ vendorId: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await getVendor(buildContext(req), req.params.vendorId);
    res.json(data);
  } catch (error) {
    handleError(error, res, next);
  }
};

export const createVendorHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const parsed = vendorInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const payload = parsed.data as VendorInput;
    const data = await createVendor(buildContext(req), payload);
    res.status(201).json(data);
  } catch (error) {
    handleError(error, res, next);
  }
};

export const updateVendorHandler: AuthedRequestHandler<{ vendorId: string }> = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const parsed = vendorInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const payload = parsed.data as VendorInput;
    const data = await updateVendor(buildContext(req), req.params.vendorId, payload);
    res.json(data);
  } catch (error) {
    handleError(error, res, next);
  }
};
