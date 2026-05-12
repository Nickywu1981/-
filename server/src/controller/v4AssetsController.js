/**
 * Movio AI v4.1 — Assets Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import db from '../dao/db.js';

export const getList = wrapController(async (req, res) => {
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
      try { data = typeof r.result_data === 'string' ? JSON.parse(r.result_data) : (r.result_data || {}); } catch { data = {}; }
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
});
