/*
 * SPDX-License-Identifier: MIT
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { Response as ExpressResponse } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { Types } from 'mongoose';
import Document from '../models/Document';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils/sendResponse';
import { writeAuditLog } from '../utils/audit';


export const getAllDocuments: AuthedRequestHandler<ParamsDictionary> = async (
  _req,
  res: ExpressResponse,
  next,
) => {

  try {
    const items = await Document.find();
    sendResponse(res, items);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const getDocumentById: AuthedRequestHandler<{ id: string }> = async (
  req,
  res: ExpressResponse,
  next,
) => {

  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }
    const item = await Document.findById(id);
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

export const createDocument: AuthedRequestHandler<ParamsDictionary> = async (
  req,
  res: ExpressResponse,
  next,
) => {

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

export const updateDocument: AuthedRequestHandler<{ id: string }> = async (
  req,
  res: ExpressResponse,
  next,
) => {

  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }

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

    const objectId = new Types.ObjectId(id);
    const updated = await Document.findByIdAndUpdate(objectId, updateData, {
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
      entityId: objectId,
      after: updated.toObject(),
    });

    sendResponse(res, updated);

    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const deleteDocument: AuthedRequestHandler<{ id: string }> = async (
  req,
  res: ExpressResponse,
  next,
) => {

  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }
    const objectId = new Types.ObjectId(id);
    const tenantId = req.tenantId;
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await Document.findByIdAndDelete(objectId);
    if (!deleted) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'Document',
      entityId: objectId,
      before: deleted.toObject(),
    });
    sendResponse(res, { message: 'Deleted successfully' });

    return;
  } catch (err) {
    next(err);
    return;
  }
};
