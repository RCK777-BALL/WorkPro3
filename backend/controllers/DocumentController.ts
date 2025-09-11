/*
 * SPDX-License-Identifier: MIT
 */

import Document from '../models/Document';
import type { AuthedRequestHandler } from '../types/http';

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
    const newItem = new Document(req.body);
    const saved = await newItem.save();
    res.status(201).json(saved);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const updateDocument: AuthedRequestHandler = async (req, res, next) => {
  try {
    const updated = await Document.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(updated);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const deleteDocument: AuthedRequestHandler = async (req, res, next) => {
  try {
    const deleted = await Document.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
};
