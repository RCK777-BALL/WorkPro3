/*
 * SPDX-License-Identifier: MIT
 */

import { promises as fs } from 'fs';
import path from 'path';
import Document from '../models/Document';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils/sendResponse';


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

export const getDocumentById: AuthedRequestHandler = async (req, res, next) => {
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

export const createDocument: AuthedRequestHandler = async (req, res, next) => {
  try {
    const { base64, url, name } = req.body as {
      base64?: string;
      url?: string;
      name?: string;
    };

    let finalUrl = url;
    let finalName = name;

    if (base64) {
      const buffer = Buffer.from(base64, 'base64');
      const filename = name || `document_${Date.now()}`;
      const uploadDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, filename), buffer);
      finalUrl = `/uploads/${filename}`;
      finalName = filename;
    }

    if (!finalUrl) {
      sendResponse(res, null, 'No document provided', 400);
      return;
    }

    const newItem = new Document({ name: finalName, url: finalUrl });
    const saved = await newItem.save();
    sendResponse(res, saved, null, 201);

    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const updateDocument: AuthedRequestHandler = async (req, res, next) => {
  try {
    const { base64, url, name } = req.body as {
      base64?: string;
      url?: string;
      name?: string;
    };

    const updateData: { name?: string; url?: string } = {};

    if (base64) {
      const buffer = Buffer.from(base64, 'base64');
      const filename = name || `document_${Date.now()}`;
      const uploadDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, filename), buffer);
      updateData.url = `/uploads/${filename}`;
      updateData.name = filename;
    } else if (url) {
      updateData.url = url;
      updateData.name = name || url.split('/').pop();
    }

    const updated = await Document.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, updated);

    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const deleteDocument: AuthedRequestHandler = async (req, res, next) => {
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
