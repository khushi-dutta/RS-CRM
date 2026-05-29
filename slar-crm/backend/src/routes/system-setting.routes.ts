import { Router } from 'express';
import { getSetting, updateSetting, getAllSettings } from '../controllers/system-setting.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate); // Ensure user is authenticated

router.get('/', getAllSettings);
router.route('/:key')
  .get(getSetting)
  .post(authorize('ADMIN', 'ACCOUNTANT'), updateSetting)
  .put(authorize('ADMIN', 'ACCOUNTANT'), updateSetting);

export default router;
