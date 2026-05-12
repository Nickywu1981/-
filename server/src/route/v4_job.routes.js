/**
 * Movio AI v4.1 — Job Routes (通用任务提交+轮询)
 * G5 后端开发 | W3
 * POST /api/jobs    — 提交任务
 * GET  /api/job/:id — 查询任务状态
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as _validate, idParamSchema } from '../utils/validate.js';
import { heavyLimiter } from '../middleware/rateLimiter.js';
import { authMiddleware } from '../middleware/auth.js';
import * as ctrl from '../controller/v4JobController.js';

const VALID_TASK_TYPES = new Set([
  'image_gen', 'image_replicate', 'batch_image_gen', 'batch_image_edit', 'batch_image_replace',
  'video_gen', 'action_migrate', 'batch_action_migrate', 'digital_human',
  'viral_analysis', 'viral_replicate', 'live_clip', 'live_cut',
  'live_noise_fix', 'live_subtitle_fix', 'storyboard', 'product_ad',
  'replace_character', 'multi_image_to_video',
]);

const router = Router();
router.use(authMiddleware);

const VALID_TYPES_ARR = [...VALID_TASK_TYPES];
const submitJobSchema = z.object({
  task_type: z.enum([VALID_TYPES_ARR[0], ...VALID_TYPES_ARR.slice(1)]),
  task_params: z.object({}).passthrough().refine(v => Object.keys(v).length <= 50, '任务参数过多').default({}),
});

// POST /api/jobs — 通用任务提交
router.post('/', heavyLimiter, _validate(submitJobSchema), ctrl.submitJob);

// GET /api/job/:id — 查询任务状态
router.get('/:id', _validate(idParamSchema, 'params'), ctrl.getJobStatus);

export default router;
