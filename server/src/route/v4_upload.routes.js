/**
 * Movio AI v4.1 — Upload Routes
 * G5 后端开发 | POST /api/upload/simple | /init | /chunk | /complete
 */
import { Router } from 'express';
import { z } from 'zod';
import { error } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { validateV4 as _validate, validate } from '../utils/validate.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { uploadQuotaGuard } from '../middleware/upload.js';
import multer from 'multer';
import * as ctrl from '../controller/v4UploadController.js';

const router = Router();
router.use(authMiddleware);

const ALLOWED_MIMES = Object.keys({
  'image/png': true, 'image/jpeg': true, 'image/webp': true,
  'image/gif': true, 'image/avif': true, 'video/mp4': true, 'video/quicktime': true,
});

const _storage = multer.memoryStorage();
const _upload = multer({
  storage: _storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      cb(new BusinessError(400, '不支持的文件类型'), false);
    } else {
      cb(null, true);
    }
  },
});

const initUploadSchema = z.object({
  file_name: z.string().min(1, '请提供文件名').max(255).refine(v => !v.includes('../') && !v.includes('..\\'), '文件名包含非法路径字符'),
  file_size: z.number().int().positive('文件大小不正确').max(500 * 1024 * 1024),
  file_type: z.string().min(1, '请提供文件类型').max(100),
});

const completeUploadSchema = z.object({
  upload_id: z.string().regex(/^[a-f0-9]{32}$/, 'upload_id 格式不正确'),
});

const chunkSchema = z.object({
  upload_id: z.string().regex(/^[a-f0-9]{32}$/, 'upload_id 格式错误'),
  chunk_index: z.coerce.number().int().min(0, 'chunk_index 必须为非负整数'),
});

function _withMulter(req, res, next) {
  _upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return error(res, ERROR_CODE.VALIDATION_ERROR, '文件大小超过50MB限制');
      }
      return error(res, ERROR_CODE.INTERNAL_ERROR, err.message || '上传处理失败');
    }
    next();
  });
}

router.post('/simple', uploadLimiter, _withMulter, uploadQuotaGuard, ctrl.saveSimpleFile);
router.post('/init', uploadLimiter, _validate(initUploadSchema), ctrl.initUpload);
router.post('/chunk', uploadLimiter, _upload.fields([{ name: 'chunk', maxCount: 1 }]), uploadQuotaGuard, validate(chunkSchema, 'body'), ctrl.receiveChunk);
router.get('/chunks/:uploadId', ctrl.getReceivedChunks);
router.post('/complete', uploadLimiter, _validate(completeUploadSchema), ctrl.completeUpload);

export default router;
