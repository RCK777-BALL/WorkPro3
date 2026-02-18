/*
 * SPDX-License-Identifier: MIT
 */

import type { ParamsDictionary } from 'express-serve-static-core';

import { fail } from '../../lib/http';
import type { AuthedRequestHandler } from '../../../types/http';
import { createMeterReading, MeterReadingError } from './service';

export const createMeterReadingHandler: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  { assetId?: string; value?: number }
> = async (req, res, next) => {
  const tenantId = req.tenantId!;

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
