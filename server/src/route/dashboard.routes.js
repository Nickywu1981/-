import { Router } from 'express';
import { adminAuth } from '../middleware/auth.js';
import { dashboardOverview } from '../controller/dashboardController.js';

const router = Router();
router.use(adminAuth);

router.get('/overview', dashboardOverview);

export default router;
