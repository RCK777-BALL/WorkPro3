/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';
import type { AuthedRequest, AuthedRequestHandler } from '../../types/http';
import type {
  PreventiveMaintenanceInput,
  PreventiveMaintenanceUpdateInput,
} from '../../../shared/validators/preventiveMaintenance';
import {
  listPreventiveMaintenance,
  getPreventiveMaintenance,
  createPreventiveMaintenance,
  updatePreventiveMaintenance,
  deletePreventiveMaintenance,
} from '../services/pm.service';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    res.status(401).json({ message: 'Missing tenant scope' });
    return false;
  }
  return true;
};

export const listPmHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const data = await listPreventiveMaintenance(req.tenantId);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getPmHandler: AuthedRequestHandler<{ pmId: string }> = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const pm = await getPreventiveMaintenance(req.tenantId, req.params.pmId);
    if (!pm) {
      res.status(404).json({ message: 'PM task not found' });
      return;
    }
    res.json(pm);
  } catch (error) {
    next(error);
  }
};

export const createPmHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const pm = await createPreventiveMaintenance(req.tenantId, req.body as PreventiveMaintenanceInput);
    res.status(201).json(pm);
  } catch (error) {
    next(error);
  }
};

export const updatePmHandler: AuthedRequestHandler<{ pmId: string }> = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const pm = await updatePreventiveMaintenance(
      req.tenantId,
      req.params.pmId,
      req.body as PreventiveMaintenanceUpdateInput,
    );
    if (!pm) {
      res.status(404).json({ message: 'PM task not found' });
      return;
    }
    res.json(pm);
  } catch (error) {
    next(error);
  }
};

export const deletePmHandler: AuthedRequestHandler<{ pmId: string }> = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    await deletePreventiveMaintenance(req.tenantId, req.params.pmId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
