import { Router } from 'express';
import { adminAuth } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { dashboardOverview } from '../controller/dashboardController.js';

const router = Router();
router.use(adminLimiter);
router.use(adminAuth);

router.get('/overview', dashboardOverview);

export default router;
