import { Router } from 'express';
import { dashboardOverview } from '../controller/dashboardController.js';

const router = Router();

router.get('/overview', dashboardOverview);

export default router;
