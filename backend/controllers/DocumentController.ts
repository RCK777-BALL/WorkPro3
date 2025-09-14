/*
 * SPDX-License-Identifier: MIT
 */

import { promises as fs } from 'fs';
import path from 'path';
import Document from '../models/Document';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils/sendResponse';
import { writeAuditLog } from '../utils/audit';
import { Response } from 'express';
import { Response } from 'express';
import { Response } from 'express';
import { Response } from 'express';
import { Response } from 'express';


export const getAllDocuments: AuthedRequestHandler = async (_req: any, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
  try {
    const items = await Document.find();
    sendResponse(res, items);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const getDocumentById: AuthedRequestHandler = async (req: { params: { id: any; }; }, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
  try {
    const item = await Document.findById(req.params.id);
    if (!item) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, item);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const createDocument: AuthedRequestHandler = async (req: { body: { base64?: string; url?: string; name?: string; }; tenantId: any; user: any; }, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
  try {
    const { base64, url, name } = req.body as {
      base64?: string;
      url?: string;
      name?: string;
    };

    const finalName = name ?? `document_${Date.now()}`;
    let finalUrl = url;

    if (base64) {
      const buffer = Buffer.from(base64, 'base64');
      const uploadDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, finalName), buffer);
      finalUrl = `/uploads/${finalName}`;
    }

    if (!finalUrl) {
      sendResponse(res, null, 'No document provided', 400);
      return;
    }

    const newItem = new Document({ name: finalName, url: finalUrl });
    const saved = await newItem.save();

    const tenantId = req.tenantId;
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'Document',
      entityId: saved._id,
      after: saved.toObject(),
    });

    sendResponse(res, saved, null, 201);

    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const updateDocument: AuthedRequestHandler = async (req: { body: { base64?: string; url?: string; name?: string; }; params: { id: any; }; tenantId: any; user: any; }, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
  try {
    const { base64, url, name } = req.body as {
      base64?: string;
      url?: string;
      name?: string;
    };

    const finalName = name ?? `document_${Date.now()}`;
    const updateData: { name?: string; url?: string } = {};

    if (base64) {
      const buffer = Buffer.from(base64, 'base64');
      const uploadDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, finalName), buffer);
      updateData.url = `/uploads/${finalName}`;
      updateData.name = finalName;
    } else if (url) {
      updateData.url = url;
      updateData.name = finalName;
    } else if (name) {
      updateData.name = finalName;
    }

    const updated = await Document.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const tenantId = req.tenantId;
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'Document',
      entityId: updated._id,
      after: updated.toObject(),
    });

    sendResponse(res, updated);

    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const deleteDocument: AuthedRequestHandler = async (req: { tenantId: any; user: any; params: { id: any; }; }, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
  try {
    const tenantId = req.tenantId;
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await Document.findByIdAndDelete(req.params.id);
    if (!deleted) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, { message: 'Deleted successfully' });

    return;
  } catch (err) {
    next(err);
    return;
  }
};
