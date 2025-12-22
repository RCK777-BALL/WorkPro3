import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requireRoles } from '../../../middleware/requireRoles';
import {
  createVendorHandler,
  deleteVendorHandler,
  getVendorHandler,
  listVendorsHandler,
  updateVendorHandler,
  vendorSpendHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', listVendorsHandler);
router.get('/:id/spend', requireRoles(['finance', 'admin', 'manager']), vendorSpendHandler);
router.get('/:id', getVendorHandler);
router.post('/', requireRoles(['buyer', 'admin', 'manager']), createVendorHandler);
router.put('/:id', requireRoles(['buyer', 'admin', 'manager']), updateVendorHandler);
router.delete('/:id', requireRoles(['buyer', 'admin', 'manager']), deleteVendorHandler);

export default router;
