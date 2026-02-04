/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';
import type { AuthedRequest, AuthedRequestHandler } from '../../types/http';
import type {
  WorkOrderCreateInput,
  WorkOrderQueryInput,
  WorkOrderUpdateInput,
} from '../../../shared/validators/workOrder';
import {
  listWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
} from '../services/workorders.service';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    res.status(401).json({ message: 'Missing tenant scope' });
    return false;
  }
  return true;
};

export const listWorkOrdersHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const data = await listWorkOrders(req.tenantId, req.query as unknown as WorkOrderQueryInput);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getWorkOrderHandler: AuthedRequestHandler<{ workOrderId: string }> = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const workOrder = await getWorkOrderById(req.tenantId, req.params.workOrderId);
    if (!workOrder) {
      res.status(404).json({ message: 'Work order not found' });
      return;
    }
    res.json(workOrder);
  } catch (error) {
    next(error);
  }
};

export const createWorkOrderHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const workOrder = await createWorkOrder(req.tenantId, req.body as WorkOrderCreateInput);
    res.status(201).json(workOrder);
  } catch (error) {
    next(error);
  }
};

export const updateWorkOrderHandler: AuthedRequestHandler<{ workOrderId: string }> = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const workOrder = await updateWorkOrder(
      req.tenantId,
      req.params.workOrderId,
      req.body as WorkOrderUpdateInput,
    );
    if (!workOrder) {
      res.status(404).json({ message: 'Work order not found' });
      return;
    }
    res.json(workOrder);
  } catch (error) {
    next(error);
  }
};

export const deleteWorkOrderHandler: AuthedRequestHandler<{ workOrderId: string }> = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    await deleteWorkOrder(req.tenantId, req.params.workOrderId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
