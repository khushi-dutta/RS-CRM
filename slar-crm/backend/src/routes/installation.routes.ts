import { Router } from 'express';
import { getMyCustomers, completeInstallation } from '../controllers/installation.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { UserRole } from '@slar-crm/shared';

const router = Router();

router.get('/my-customers', authenticate, authorize(UserRole.INSTALLATION, UserRole.ADMIN), getMyCustomers);
router.post('/:customerId/complete', authenticate, authorize(UserRole.INSTALLATION, UserRole.ADMIN), completeInstallation);

export default router;
