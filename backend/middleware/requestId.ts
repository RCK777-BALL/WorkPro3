/*
 * SPDX-License-Identifier: MIT
 */

import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.header("x-request-id");
  const id = incoming && incoming.trim().length > 0 ? incoming : randomUUID();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
};

export default requestId;
