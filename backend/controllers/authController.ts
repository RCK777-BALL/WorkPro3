/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';
import type { AuthedRequestHandler } from '../types/http';


/**
 * Return the authenticated user's payload from the request.
 */
export const getMe: AuthedRequestHandler = async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    res.status(200).json({ user });
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
  res.status(200).json({ message: 'Logged out successfully' });
  return;
};
 

/**
 * Placeholder MFA setup handler. In a real implementation this would
 * generate and return a secret for the user to configure their MFA device.
 */
export const setupMfa: AuthedRequestHandler = (req, res) => {
  res.status(501).json({ message: 'MFA setup not implemented' });
  return;
};

/**
 * Placeholder MFA token validation handler.
 */
export const validateMfaToken: AuthedRequestHandler = (req, res) => {
  res.status(501).json({ message: 'MFA token validation not implemented' });
  return;
};

