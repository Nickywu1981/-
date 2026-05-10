/**
 * Movio AI v4.1 — Job Routes (通用任务提交+轮询)
 * G5 后端开发 | W3
 * POST /api/jobs    — 提交任务
 * GET  /api/job/:id — 查询任务状态
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { validateV4 as _validate } from '../utils/validate.js';
import * as jobQueueService from '../services/job-queue.service.js';

const VALID_TASK_TYPES = new Set([
  'image_gen', 'image_replicate', 'batch_image_gen', 'batch_image_edit', 'batch_image_replace',
  'video_gen', 'action_migrate', 'batch_action_migrate', 'digital_human',
  'viral_analysis', 'viral_replicate', 'live_clip', 'live_cut',
  'live_noise_fix', 'live_subtitle_fix', 'storyboard', 'product_ad',
  'replace_character', 'multi_image_to_video',
]);

const router = Router();

const VALID_TYPES_ARR = [...VALID_TASK_TYPES];
const submitJobSchema = z.object({
  task_type: z.enum([VALID_TYPES_ARR[0], ...VALID_TYPES_ARR.slice(1)]),
  task_params: z.object({}).passthrough().default({}),
});

// POST /api/jobs — 通用任务提交
router.post('/', _validate(submitJobSchema), async (req, res) => {
  try {
    const { task_type, task_params } = req.validated;
    const result = await jobQueueService.submitJob(req.user.id, task_type, task_params || {});
    return success(res, result, '任务已提交');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

// GET /api/job/:id — 查询任务状态
const idParamSchema = z.object({ id: z.string().regex(/^\d+$/).transform(Number) });
router.get('/:id', _validate(idParamSchema, 'params'), async (req, res) => {
  try {
    const job = await jobQueueService.getJobStatus(req.params.id, req.user.id);
    return success(res, job);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

export default router;
