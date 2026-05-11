import { Router } from 'express';
import { uploadFile, uploadMultipleFiles } from '../controller/uploadController.js';
import { uploadMiddleware, magicNumberGuard, uploadQuotaGuard } from '../middleware/upload.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';

const router = Router();

const uploadSchema = z.object({
  category: z.string().max(50).optional(),
  tags: z.string().max(200).optional(),
});

router.post('/image', authMiddleware, uploadLimiter, validate(uploadSchema), uploadMiddleware.single('file'), magicNumberGuard, uploadQuotaGuard, uploadFile);
router.post('/images', authMiddleware, uploadLimiter, validate(uploadSchema), uploadMiddleware.array('files', 50), magicNumberGuard, uploadQuotaGuard, uploadMultipleFiles);

export default router;
