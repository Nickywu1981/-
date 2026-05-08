import { Router } from 'express';
import { listNotifications, getUnreadCount, markOneRead, markAllRead, sendNotification, deleteNotification, listAllNotifications } from '../controller/notificationController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const sendSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  userIds: z.array(z.number().int().positive()).min(1).max(1000).optional(),
  type: z.enum(['system', 'marketing', 'alert']).optional(),
});

router.get('/', authMiddleware, asyncHandler(listNotifications));
router.get('/unread-count', authMiddleware, asyncHandler(getUnreadCount));
router.put('/:id/read', authMiddleware, asyncHandler(markOneRead));
router.put('/read-all', authMiddleware, asyncHandler(markAllRead));
router.post('/send', authMiddleware, adminAuth, validate(sendSchema), asyncHandler(sendNotification));
router.delete('/:id', authMiddleware, adminAuth, asyncHandler(deleteNotification));
router.get('/admin/all', authMiddleware, adminAuth, asyncHandler(listAllNotifications));

export default router;
