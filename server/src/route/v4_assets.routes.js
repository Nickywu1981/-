/**
 * Movio AI v4.1 — Assets Routes (素材库)
 * G5 后端开发 | W4
 * GET /api/assets/list — 聚合用户所有作品(图片+视频)
 */
import { Router } from 'express';
import z from 'zod';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import db from '../dao/db.js';

const router = Router();
router.use(authMiddleware);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(24),
  type: z.enum(['image', 'video']).optional(),
});

router.get('/list', validate(listQuerySchema, 'query'), async (req, res) => {
  try {
    const { page, pageSize, type } = req.query;

    const conn = await db.getConnection();
    try {
      let taskTypes = [];
      if (type === 'image') {
        taskTypes = ['image_gen', 'image_replicate', 'batch_image_gen', 'batch_image_edit'];
      } else if (type === 'video') {
        taskTypes = ['video_gen', 'action_migrate', 'digital_human', 'viral_replicate', 'live_clip'];
      } else {
        taskTypes = ['image_gen', 'image_replicate', 'batch_image_gen', 'batch_image_edit',
                     'video_gen', 'action_migrate', 'digital_human', 'viral_replicate', 'live_clip'];
      }

      const placeholders = taskTypes.map(() => '?').join(',');

      const [[{ total }]] = await conn.query(
        `SELECT COUNT(*) as total FROM job_queue
         WHERE user_id = ? AND status = 'completed' AND task_type IN (${placeholders})`,
        [req.user.id, ...taskTypes],
      );

      const [rows] = await conn.query(
        `SELECT id, task_type, result_data, completed_at as created_at
         FROM job_queue
         WHERE user_id = ? AND status = 'completed' AND task_type IN (${placeholders})
         ORDER BY completed_at DESC LIMIT ? OFFSET ?`,
        [req.user.id, ...taskTypes, pageSize, (page - 1) * pageSize],
      );

      const list = rows.map(r => {
        let data = {};
        try { data = typeof r.result_data === 'string' ? JSON.parse(r.result_data) : (r.result_data || {}); } catch { /* corrupt JSON in result_data — return empty */ data = {}; }
        const url = data.file_url || data.video_url || data.image_url || '';
        const isVideo = ['video_gen', 'action_migrate', 'digital_human', 'viral_replicate', 'live_clip'].includes(r.task_type);
        return {
          id: r.id,
          type: isVideo ? 'video' : 'image',
          task_type: r.task_type,
          url,
          meta: data,
          created_at: r.created_at,
        };
      });

      return success(res, { list, total, page, pageSize });
    } finally {
      conn.release();
    }
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

export default router;
