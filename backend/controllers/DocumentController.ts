/*
 * SPDX-License-Identifier: MIT
 */

import Document from '../models/Document';
import type { AuthedRequestHandler } from '../types/http';
import { writeAuditLog } from '../utils/audit';

export const getAllDocuments: AuthedRequestHandler = async (_req, res, next) => {
  try {
    const items = await Document.find();
    res.json(items);
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
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(item);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const createDocument: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const newItem = new Document({ ...req.body, tenantId });
    const saved = await newItem.save();
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'Document',
      entityId: saved._id,
      after: saved.toObject(),
    });
    res.status(201).json(saved);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const updateDocument: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const existing = await Document.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const updated = await Document.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'Document',
      entityId: req.params.id,
      before: existing.toObject(),
      after: updated?.toObject(),
    });
    res.json(updated);
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
      res.status(404).json({ message: 'Not found' });
      return;
    }
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'Document',
      entityId: req.params.id,
      before: deleted.toObject(),
    });
    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
};
