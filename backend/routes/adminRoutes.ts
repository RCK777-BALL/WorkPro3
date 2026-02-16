/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import WorkflowRule from '../models/WorkflowRule';
import SlaPolicy from '../models/SlaPolicy';
import IdentityProviderConfig from '../models/IdentityProviderConfig';
import { writeAuditLog } from '../utils';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);
router.use(requireRole('admin'));

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

router.get('/auth-config', async (req, res, next) => {
  try {
    const configs = await IdentityProviderConfig.find({ tenantId: req.tenantId }).lean();
    res.json({ success: true, data: configs });
  } catch (err) {
    next(err);
  }
});

const authConfigSchema = z.object({
  protocol: z.enum(['saml', 'oidc']),
  provider: z.string().min(1),
  displayName: z.string().optional(),
  issuer: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  metadataUrl: z.string().optional(),
  metadataXml: z.string().optional(),
  redirectUri: z.string().optional(),
  acsUrl: z.string().optional(),
  enabled: z.boolean().optional(),
});

router.put('/auth-config/:provider', async (req, res, next) => {
  try {
    const parsed = authConfigSchema.safeParse({ ...req.body, provider: req.params.provider });
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Invalid configuration' });
      return;
    }

    const payload = { ...parsed.data, tenantId: req.tenantId };
    const updated = await IdentityProviderConfig.findOneAndUpdate(
      { tenantId: req.tenantId, protocol: payload.protocol, provider: payload.provider },
      payload,
      { returnDocument: 'after', upsert: true },
    );

    await writeAuditLog({
      tenantId: req.tenantId,
      userId: req.user?._id,
      action: 'auth_config_updated',
      entityType: 'identity_provider_config',
      entityId: updated._id.toString(),
      after: payload,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.get('/workflow-rules', async (req, res, next) => {
  try {
    const rules = await WorkflowRule.find({ tenantId: req.tenantId }).sort({ updatedAt: -1 });
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
});

router.post('/workflow-rules', async (req, res, next) => {
  try {
    const payload = { ...req.body, tenantId: req.tenantId };
    const created = await WorkflowRule.create(payload);
    if (payload.isDefault) {
      await WorkflowRule.updateMany(
        { _id: { $ne: created._id }, tenantId: req.tenantId, scope: created.scope, siteId: created.siteId },
        { isDefault: false },
      );
    }
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/workflow-rules/:id', async (req, res, next) => {
  try {
    const updated = await WorkflowRule.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { returnDocument: 'after' },
    );
    if (!updated) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }
    if (updated.isDefault) {
      await WorkflowRule.updateMany(
        { _id: { $ne: updated._id }, tenantId: req.tenantId, scope: updated.scope, siteId: updated.siteId },
        { isDefault: false },
      );
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.get('/sla-policies', async (req, res, next) => {
  try {
    const policies = await SlaPolicy.find({ tenantId: req.tenantId }).sort({ updatedAt: -1 });
    res.json({ success: true, data: policies });
  } catch (err) {
    next(err);
  }
});

router.post('/sla-policies', async (req, res, next) => {
  try {
    const created = await SlaPolicy.create({ ...req.body, tenantId: req.tenantId });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/sla-policies/:id', async (req, res, next) => {
  try {
    const updated = await SlaPolicy.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { returnDocument: 'after' },
    );
    if (!updated) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
