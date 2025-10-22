/*
 * SPDX-License-Identifier: MIT
 */

import type { NextFunction, Response } from 'express';
import mongoose from 'mongoose';

import sendResponse from './sendResponse';

type ValidationPayload = string | string[];

type Overrides = {
  validationMessage?: string;
  castMessage?: string;
};

const extractValidationMessages = (error: mongoose.Error.ValidationError): ValidationPayload => {
  const messages = Object.values(error.errors)
    .map((detail) => detail.message)
    .filter((message): message is string => Boolean(message));

  if (messages.length === 0) {
    return error.message;
  }

  return messages.length === 1 ? messages[0] : messages;
};

/**
 * Normalizes common Mongoose errors into structured HTTP responses so
 * controllers return predictable payloads without repeating boilerplate.
 */
const handleControllerError = (
  res: Response,
  error: unknown,
  next: NextFunction,
  overrides: Overrides = {},
): void => {
  if (error instanceof mongoose.Error.ValidationError) {
    const payload = overrides.validationMessage ?? extractValidationMessages(error);
    sendResponse(res, null, payload, 400);
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    const field = error.path ?? 'identifier';
    const message = overrides.castMessage ?? `Invalid ${field}`;
    sendResponse(res, null, message, 400);
    return;
  }

  next(error as Error);
};

export default handleControllerError;
