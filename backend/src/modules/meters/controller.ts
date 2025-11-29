/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { fail } from '../../lib/http';
import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { createMeterReading, MeterReadingError } from './service';

const ensureTenant = (req: AuthedRequest, res: Response): string | undefined => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required', 400);
    return undefined;
  }
  return req.tenantId;
};

export const createMeterReadingHandler: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  { assetId?: string; value?: number }
> = async (req, res, next) => {
  const tenantId = ensureTenant(req, res);
  if (!tenantId) return;

  try {
    const reading = await createMeterReading(
      { tenantId, siteId: req.siteId },
      { assetId: req.body.assetId, value: req.body.value },
    );
    res.status(201).json({ success: true, data: reading });
  } catch (err) {
    if (err instanceof MeterReadingError) {
      fail(res, err.message, err.status);
      return;
    }
    next(err);
  }
};
