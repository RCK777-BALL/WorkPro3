/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils/sendResponse';


/**
 * Return the authenticated user's payload from the request.
 */
export const getMe: AuthedRequestHandler = async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (!user) {
      sendResponse(res, null, 'Unauthorized', 401);
      return;
    }
    sendResponse(res, { user });
    return;
  } catch (err) {
    next(err);
    return;
  }
};
 
 /**
 * Clear the authentication token cookie and end the session.
 */
export const logout: AuthedRequestHandler = (req, res) => {
  res.clearCookie('token');
  sendResponse(res, { message: 'Logged out successfully' });
  return;
};
 

/**
 * Placeholder MFA setup handler. In a real implementation this would
 * generate and return a secret for the user to configure their MFA device.
 */
export const setupMfa: AuthedRequestHandler = (req, res) => {
  sendResponse(res, null, 'MFA setup not implemented', 501);
  return;
};

/**
 * Placeholder MFA token validation handler.
 */
export const validateMfaToken: AuthedRequestHandler = (req, res) => {
  sendResponse(res, null, 'MFA token validation not implemented', 501);
  return;
};

