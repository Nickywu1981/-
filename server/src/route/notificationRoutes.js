import { Router } from 'express';
import { listNotifications, getUnreadCount, markOneRead, markAllRead, sendNotification, deleteNotification, listAllNotifications } from '../controller/notificationController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { validate, idParamSchema } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const sendSchema = z.object({
  userId: z.number().int().positive(),
  type: z.string().max(50).optional(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
});

const adminListQuerySchema = z.object({ userId: z.coerce.number().int().positive().optional(), type: z.string().max(50).optional() });

router.get('/', authMiddleware, listNotifications);
router.get('/unread-count', authMiddleware, getUnreadCount);
router.put('/:id/read', authMiddleware, validate(idParamSchema, 'params'), markOneRead);
router.put('/read-all', authMiddleware, markAllRead);
router.post('/send', adminLimiter, authMiddleware, adminAuth, validate(sendSchema), sendNotification);
router.delete('/:id', adminLimiter, authMiddleware, adminAuth, validate(idParamSchema, 'params'), deleteNotification);
router.get('/admin/all', authMiddleware, adminAuth, validate(adminListQuerySchema, 'query'), listAllNotifications);

export default router;
