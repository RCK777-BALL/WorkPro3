/*
 * SPDX-License-Identifier: MIT
 */

import type { NextFunction, Response } from 'express';
import { Types } from 'mongoose';

import type { AuthedRequest } from '../../../types/http';
import WorkOrder from '../../../models/WorkOrder';
import { fail } from '../../lib/http';

const isObjectId = (value: unknown): value is Types.ObjectId => value instanceof Types.ObjectId;

export const enforceSafetyControls = async (
  req: AuthedRequest<{ workOrderId: string }>,
  res: Response,
  next: NextFunction,
) => {
  const workOrderId = req.params.workOrderId;
  if (!workOrderId) {
    fail(res, 'Work order id is required', 400);
    return;
  }
  try {
    const workOrder = await WorkOrder.findOne({ _id: workOrderId, tenantId: req.tenantId }).lean();
    if (!workOrder) {
      fail(res, 'Work order not found', 404);
      return;
    }

    const pendingPermits = (workOrder.requiredPermitTypes ?? []).filter(
      (type) => !(workOrder.permitApprovals ?? []).some((approval) => approval.type === type && approval.status === 'approved'),
    );

    if (pendingPermits.length) {
      fail(res, `Permits required before transition: ${pendingPermits.join(', ')}`, 409);
      return;
    }

    const hasUnverifiedLoto = (workOrder.lockoutTagout ?? []).some((step) => !step.verifiedAt);
    if (hasUnverifiedLoto) {
      fail(res, 'All lockout/tagout steps must be verified before this transition', 409);
      return;
    }

    if (req.body?.status === 'completed' && (workOrder.approvalSteps ?? []).length) {
      const activeStep = (workOrder.approvalSteps ?? []).find((step) => step.step === workOrder.currentApprovalStep);
      if (activeStep && activeStep.status !== 'approved') {
        fail(res, 'Work order completion blocked: pending approvals', 409);
        return;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

export const resolveUserId = (user?: { _id?: Types.ObjectId | string; id?: Types.ObjectId | string }) => {
  const raw = user?._id ?? user?.id;
  if (!raw) return undefined;
  return isObjectId(raw) ? raw : new Types.ObjectId(raw);
};
