import { Router } from 'express';
import { listLeads, getLead, updateLead, addCallLog, convertToCustomer } from '../controllers/lead.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { body } from 'express-validator';

const router = Router();

router.use(authenticate);

router.get('/', listLeads);
router.get('/:id', getLead);

router.patch('/:id', updateLead);

router.post('/:id/call-log', [
  body('callType').isIn(['INBOUND', 'OUTBOUND']),
  body('disposition').notEmpty(),
  validate
], addCallLog);

router.post('/:id/convert-to-customer', convertToCustomer);

export default router;
