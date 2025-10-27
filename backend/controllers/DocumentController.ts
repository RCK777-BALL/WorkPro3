/*
 * SPDX-License-Identifier: MIT
 */

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';

import type { ParamsDictionary } from 'express-serve-static-core';
import Document, { type StoredDocumentMetadata } from '../models/Document';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils/sendResponse';
import { writeAuditLog } from '../utils/audit';
import { toObjectId, toEntityId } from '../utils/ids';

interface DocumentMetadataPayload {
  mimeType?: string;
  size?: number;
  lastModified?: string;
}

interface DocumentPayload {
  base64?: string;
  url?: string;
  name?: string;
  metadata?: {
    size?: number;
    mimeType?: string;
    lastModified?: string;
    type?: string;
  };
}

const parseMetadataPayload = (
  input?: DocumentPayload['metadata'],
): StoredDocumentMetadata | undefined => {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const metadata: StoredDocumentMetadata = {};

  if (typeof input.size === 'number' && Number.isFinite(input.size) && input.size >= 0) {
    metadata.size = input.size;
  }

  if (typeof input.mimeType === 'string' && input.mimeType.trim().length > 0) {
    metadata.mimeType = input.mimeType.trim();
  }

  if (typeof input.type === 'string' && input.type.trim().length > 0) {
    metadata.type = input.type.trim();
  }

  if (input.lastModified) {
    const parsedDate = new Date(input.lastModified);
    if (!Number.isNaN(parsedDate.getTime())) {
      metadata.lastModified = parsedDate;
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
};

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

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.xlsx', '.xls'];

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

const parseLastModified = (input?: string | Date): Date | undefined => {
  if (!input) {
    return undefined;
  }
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? undefined : input;
  }
  const value = new Date(input);
  if (Number.isNaN(value.getTime())) {
    return undefined;
  }
  return value;
};

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

export const createDocument: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  DocumentPayload
> = async (req, res, next) => {

  try {
    const { base64, url, name, metadata: metadataPayload } = req.body ?? {};

    let displayName = name ?? `document_${Date.now()}`;
    let finalUrl = url;
    const metadata = parseMetadataPayload(metadataPayload);

    const sanitizedMetadata: {
      mimeType?: string;
      size?: number;
      lastModified?: Date;
    } = {};

    if (metadata?.mimeType) {
      if (!ALLOWED_MIME_TYPES.has(metadata.mimeType)) {
        sendResponse(res, null, 'Invalid mime type', 400);
        return;
      }
      sanitizedMetadata.mimeType = metadata.mimeType;
    }

    if (metadata?.size !== undefined) {
      const parsedSize = Number(metadata.size);
      if (!Number.isFinite(parsedSize) || parsedSize < 0) {
        sendResponse(res, null, 'Invalid size', 400);
        return;
      }
      sanitizedMetadata.size = parsedSize;
    }

    if (metadata?.lastModified) {
      const parsedDate = parseLastModified(metadata.lastModified);
      if (!parsedDate) {
        sendResponse(res, null, 'Invalid last modified date', 400);
        return;
      }
      sanitizedMetadata.lastModified = parsedDate;
    }

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

    const newItem = new Document({
      name: displayName,
      url: finalUrl,
      ...(metadata ? { metadata } : {}),
    });
    const saved = await newItem.save();

    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const userId = toEntityId((req.user as any)?._id ?? (req.user as any)?.id);
    const entityId = toEntityId(saved._id as Types.ObjectId);
    if (!entityId) {
      throw new Error('Unable to resolve document identifier for auditing');
    }
    if (tenantId) {
      await writeAuditLog({
        tenantId,
        ...(userId ? { userId } : {}),
        action: 'create',
        entityType: 'Document',
        entityId,
        after: saved.toObject(),
      });
    }

    sendResponse(res, saved, null, 201);

    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const updateDocument: AuthedRequestHandler<
  { id: string },
  unknown,
  DocumentPayload
> = async (req, res, next) => {

  try {
    const { id } = req.params;
    const objectId = toObjectId(id);
    if (!objectId) {
      sendResponse(res, null, 'Invalid ID', 400);
      return;
    }

    const { base64, url, name, metadata: metadataPayload } = req.body ?? {};

    const entityId: Types.ObjectId = objectId;
    const updateData: { name?: string; url?: string; metadata?: StoredDocumentMetadata } = {};
    let hasFileUpdate = false;

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
      hasFileUpdate = true;
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
      hasFileUpdate = true;
    }

    if (!hasFileUpdate && Object.keys(updateData).length === 0) {
      sendResponse(res, null, 'No document provided', 400);
      return;
    }

    const metadata = parseMetadataPayload(metadataPayload);
    if (metadata) {
      updateData.metadata = metadata;
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
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const userId = toEntityId((req.user as any)?._id ?? (req.user as any)?.id);
    if (tenantId) {
      await writeAuditLog({
        tenantId,
        ...(userId ? { userId } : {}),
        action: 'update',
        entityType: 'Document',
        entityId,
        after: updated.toObject(),
      });
    }

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
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const userId = toEntityId((req.user as any)?._id ?? (req.user as any)?.id);
    const entityId: Types.ObjectId = objectId;
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

    if (tenantId) {
      await writeAuditLog({
        tenantId,
        ...(userId ? { userId } : {}),
        action: 'delete',
        entityType: 'Document',
        entityId,
        before: deleted.toObject(),
      });
    }
    sendResponse(res, { message: 'Deleted successfully' });

    return;
  } catch (err) {
    next(err);
    return;
  }
};
