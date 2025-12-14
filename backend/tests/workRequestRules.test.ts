/*
 * SPDX-License-Identifier: MIT
 */

import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import RequestType from '../models/RequestType';
import RequestRoutingRule from '../models/RequestRoutingRule';
import RequestForm from '../models/RequestForm';
import Tenant from '../models/Tenant';
import Site from '../models/Site';
import WorkRequest from '../models/WorkRequest';
import WorkOrder from '../models/WorkOrder';
import { submitPublicRequest } from '../src/modules/work-requests/service';
import type { Express } from 'express';

let mongo: MongoMemoryServer | undefined;
let tenantId: Types.ObjectId;
let siteId: Types.ObjectId;

const baseFields = {
  title: 'Safety alert',
  description: 'Chemical smell near the mixing station',
  requesterName: 'Jordan',
};

const seedCore = async () => {
  const tenant = await Tenant.create({ name: 'CoreCo' });
  tenantId = tenant._id;
  const site = await Site.create({ name: 'Plant 1', tenantId });
  siteId = site._id;
};

const buildForm = async (slug: string, requestType?: Types.ObjectId, attachments = []) =>
  RequestForm.create({
    slug,
    name: `${slug} form`,
    schema: { requestType, attachments },
    requestType,
    attachments,
    siteId,
    tenantId,
  });

describe('work request routing and conversion', () => {
  beforeAll(async () => {
    process.env.MONGOMS_DISTRO = 'ubuntu-18.04';
    mongo = await MongoMemoryServer.create({ binary: { version: '7.0.5' } });
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
    await seedCore();
  });

  it('enforces required fields and attachments from the request type', async () => {
    const type = await RequestType.create({
      name: 'Asset issue',
      slug: 'asset-issue',
      category: 'assets',
      requiredFields: ['assetTag'],
      attachments: [{ key: 'photo', label: 'Photo evidence', required: true }],
      tenantId,
      siteId,
    });
    await buildForm('asset-issue', type._id, type.attachments);

    await expect(
      submitPublicRequest({ ...baseFields, formSlug: 'asset-issue', assetTag: '' }, [] as Express.Multer.File[]),
    ).rejects.toThrow('Missing required fields');

    await expect(
      submitPublicRequest({ ...baseFields, formSlug: 'asset-issue', assetTag: 'A-123' }, [] as Express.Multer.File[]),
    ).rejects.toThrow('Attachment "Photo evidence" is required.');
  });

  it('routes requests using asset, site, priority, and category rules', async () => {
    const type = await RequestType.create({
      name: 'Safety',
      slug: 'safety',
      category: 'safety',
      defaultPriority: 'high',
      requiredFields: [],
      attachments: [],
      tenantId,
      siteId,
    });
    await buildForm('safety', type._id);
    const destinationId = new Types.ObjectId();
    const rule = await RequestRoutingRule.create({
      name: 'Route safety to response team',
      tenantId,
      siteId,
      requestType: type._id,
      assetTag: 'LINE-7',
      priority: 'high',
      category: 'safety',
      destination: { destinationType: 'team', destinationId },
    });

    const result = await submitPublicRequest(
      { ...baseFields, formSlug: 'safety', assetTag: 'LINE-7', priority: 'high' },
      [] as Express.Multer.File[],
    );

    const stored = await WorkRequest.findById(result.requestId).lean();
    expect(stored?.routing?.ruleId?.toString()).toBe(rule._id.toString());
    expect(stored?.routing?.destinationType).toBe('team');
    expect(stored?.status).toBe('reviewing');
  });

  it('auto-converts approved requests into work orders', async () => {
    const form = await buildForm('general');
    const request = await WorkRequest.create({
      token: 'token123',
      title: 'Loose guard rail',
      description: 'Guard rail is loose near stairs',
      requesterName: 'Sam',
      priority: 'medium',
      status: 'new',
      tenantId,
      siteId,
      requestForm: form._id,
    });

    request.approvalStatus = 'approved';
    await request.save();

    const updated = await WorkRequest.findById(request._id).lean();
    expect(updated?.workOrder).toBeTruthy();
    expect(updated?.status).toBe('converted');

    const linkedOrder = await WorkOrder.findById(updated?.workOrder).lean();
    expect(linkedOrder?.requestId?.toString()).toBe(request._id.toString());
  });
});
