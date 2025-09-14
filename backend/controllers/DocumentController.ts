/*
 * SPDX-License-Identifier: MIT
 */

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

import Document from '../models/Document';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils/sendResponse';
import { writeAuditLog } from '../utils/audit';
import { toObjectId, toEntityId } from '../utils/ids';



export const getAllDocuments: AuthedRequestHandler = async (_req, res, next) => {

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
  res,
  next,
) => {

  try {
    const { id } = req.params;
    const objectId = toObjectId(id);
    if (!objectId) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }
    const item = await Document.findById(objectId);
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

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg'];

const validateFileName = (input: string): { base: string; ext: string } => {
  const base = path.basename(input);
  if (base !== input) {
    throw new Error('Invalid file name');
  }
  const ext = path.extname(base).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error('Invalid file extension');
  }
  return { base, ext };
};

export const createDocument: AuthedRequestHandler = async (
  req,
  res,
  next,
) => {

  try {
    const { base64, url, name } = req.body as {
      base64?: string;
      url?: string;
      name?: string;
    };

    let displayName = name ?? `document_${Date.now()}`;
    let finalUrl = url;

    if (base64) {
      if (!name) {
        sendResponse(res, null, 'Name is required for file uploads', 400);
        return;
      }
      let safeName;
      try {
        safeName = validateFileName(name);
      } catch {
        sendResponse(res, null, 'Invalid file name', 400);
        return;
      }
      const buffer = Buffer.from(base64, 'base64');
      const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
      await fs.mkdir(uploadDir, { recursive: true });
      const uniqueName = `${randomUUID()}${safeName.ext}`;
      await fs.writeFile(path.join(uploadDir, uniqueName), buffer);
      finalUrl = `/uploads/documents/${uniqueName}`;
      displayName = safeName.base;
    } else if (name) {
      try {
        const safeName = validateFileName(name);
        displayName = safeName.base;
      } catch {
        sendResponse(res, null, 'Invalid file name', 400);
        return;
      }
    }

    if (!finalUrl) {
      sendResponse(res, null, 'No document provided', 400);
      return;
    }

    const newItem = new Document({ name: displayName, url: finalUrl });
    const saved = await newItem.save();

    const tenantId = req.tenantId;
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'Document',
      entityId: toEntityId(saved._id),
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
  res,
  next,
) => {

  try {
    const { id } = req.params;
    const objectId = toObjectId(id);
    if (!objectId) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }

    const { base64, url, name } = req.body as {
      base64?: string;
      url?: string;
      name?: string;
    };

    const updateData: { name?: string; url?: string } = {};

    if (base64) {
      if (!name) {
        sendResponse(res, null, 'Name is required for file uploads', 400);
        return;
      }
      let safeName;
      try {
        safeName = validateFileName(name);
      } catch {
        sendResponse(res, null, 'Invalid file name', 400);
        return;
      }
      const buffer = Buffer.from(base64, 'base64');
      const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
      await fs.mkdir(uploadDir, { recursive: true });
      const uniqueName = `${randomUUID()}${safeName.ext}`;
      await fs.writeFile(path.join(uploadDir, uniqueName), buffer);
      updateData.url = `/uploads/documents/${uniqueName}`;
      updateData.name = safeName.base;
    } else if (url) {
      updateData.url = url;
      if (name) {
        try {
          const safeName = validateFileName(name);
          updateData.name = safeName.base;
        } catch {
          sendResponse(res, null, 'Invalid file name', 400);
          return;
        }
      }
    } else {
      // Should not happen due to validators, but handle gracefully
      sendResponse(res, null, 'No document provided', 400);
      return;
    }

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
      entityId: toEntityId(objectId),
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
  res,
  next,
) => {

  try {
    const { id } = req.params;
    const objectId = toObjectId(id);
    if (!objectId) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }
    const tenantId = req.tenantId;
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await Document.findByIdAndDelete(objectId);
    if (!deleted) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    if (deleted.url && deleted.url.startsWith('/uploads/documents/')) {
      const filePath = path.join(process.cwd(), deleted.url.replace(/^\//, ''));
      try {
        await fs.unlink(filePath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          // ignore missing file, but rethrow others
          throw err;
        }
      }
    }

    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'Document',
      entityId: toEntityId(objectId),
      before: deleted.toObject(),
    });
    sendResponse(res, { message: 'Deleted successfully' });

    return;
  } catch (err) {
    next(err);
    return;
  }
};
