import { Router } from 'express';
import { listNotifications, getUnreadCount, markOneRead, markAllRead, sendNotification, deleteNotification, listAllNotifications } from '../controller/notificationController.js';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const sendSchema = z.object({
  userId: z.number().int().positive(),
  type: z.string().max(50).optional(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
});

router.get('/', authMiddleware, asyncHandler(listNotifications));
router.get('/unread-count', authMiddleware, asyncHandler(getUnreadCount));
router.put('/:id/read', authMiddleware, asyncHandler(markOneRead));
router.put('/read-all', authMiddleware, asyncHandler(markAllRead));
router.post('/send', authMiddleware, adminAuth, validate(sendSchema), asyncHandler(sendNotification));
router.delete('/:id', authMiddleware, adminAuth, asyncHandler(deleteNotification));
router.get('/admin/all', authMiddleware, adminAuth, asyncHandler(listAllNotifications));

export default router;
