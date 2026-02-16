/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import NotificationTemplate from '../models/NotificationTemplate';
import NotificationSubscription from '../models/NotificationSubscription';
import type { AuthedRequestHandler } from '../types/http';
import { sendResponse } from '../utils';

const asObjectId = (value: string | Types.ObjectId | undefined) => {
  if (!value) return undefined;
  return typeof value === 'string' ? new Types.ObjectId(value) : value;
};

export const listTemplates: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const templates = await NotificationTemplate.find({ tenantId });
    sendResponse(res, templates);
  } catch (err) {
    next(err);
  }
};

export const upsertTemplate: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const { event, channel, subject, body, id } = req.body as {
      id?: string;
      event: string;
      channel: string;
      subject?: string;
      body: string;
    };
    const filter = id ? { _id: id, tenantId } : { event, channel, tenantId };
    const template = await NotificationTemplate.findOneAndUpdate(
      filter,
      { event, channel, subject, body, tenantId },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
    sendResponse(res, template, null, id ? 200 : 201);
  } catch (err) {
    next(err);
  }
};

export const deleteTemplate: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const { id } = req.params as { id?: string };
    if (!id) {
      sendResponse(res, null, 'Template id required', 400);
      return;
    }
    await NotificationTemplate.findOneAndDelete({ _id: id, tenantId });
    sendResponse(res, { message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

export const listSubscriptions: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const subscriptions = await NotificationSubscription.find({ tenantId });
    sendResponse(res, subscriptions);
  } catch (err) {
    next(err);
  }
};

export const upsertSubscription: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const { id, events, channels, quietHours, digest, userId, group } = req.body as {
      id?: string;
      userId?: string;
      group?: string;
      events: string[];
      channels: string[];
      quietHours?: { start?: string; end?: string };
      digest?: { enabled?: boolean; frequency?: 'hourly' | 'daily' | 'weekly' };
    };

    const filter = id ? { _id: id, tenantId } : { tenantId, ...(userId ? { userId } : {}), ...(group ? { group } : {}) };
    const subscription = await NotificationSubscription.findOneAndUpdate(
      filter,
      {
        tenantId,
        userId: asObjectId(userId),
        group,
        events,
        channels,
        quietHours,
        digest,
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
    sendResponse(res, subscription, null, id ? 200 : 201);
  } catch (err) {
    next(err);
  }
};

export const deleteSubscription: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const { id } = req.params as { id?: string };
    if (!id) {
      sendResponse(res, null, 'Subscription id required', 400);
      return;
    }
    await NotificationSubscription.findOneAndDelete({ _id: id, tenantId });
    sendResponse(res, { message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
