/**
 * Assets DAO — 用户资产/作品数据访问层
 * 查询 job_queue 表中已完成的任务作为用户资产
 */
import pool from './db.js';
import { parsePagination } from '../utils/pagination.js';

const IMAGE_TYPES = ['image_gen', 'image_replicate', 'batch_image_gen', 'batch_image_edit'];
const VIDEO_TYPES = ['video_gen', 'action_migrate', 'digital_human', 'viral_replicate', 'live_clip'];
const ALL_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];

export async function listUserAssets({ userId, type, page = 1, pageSize = 20 }) {
  let taskTypes;
  if (type === 'image') taskTypes = IMAGE_TYPES;
  else if (type === 'video') taskTypes = VIDEO_TYPES;
  else taskTypes = ALL_TYPES;

  const placeholders = taskTypes.map(() => '?').join(',');
  const params = [userId, ...taskTypes];
  const { offset } = parsePagination({ page, pageSize });

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM job_queue
     WHERE user_id = ? AND status = 'completed' AND task_type IN (${placeholders})`,
    params,
  );

  const [rows] = await pool.query(
    `SELECT id, task_type, result_data, completed_at as created_at
     FROM job_queue
     WHERE user_id = ? AND status = 'completed' AND task_type IN (${placeholders})
     ORDER BY completed_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );

  const list = rows.map(r => {
    let data = {};
    try { data = typeof r.result_data === 'string' ? JSON.parse(r.result_data) : (r.result_data || {}); } catch { data = {}; }
    const url = data.file_url || data.video_url || data.image_url || '';
    const isVideo = VIDEO_TYPES.includes(r.task_type);
    return { id: r.id, type: isVideo ? 'video' : 'image', task_type: r.task_type, url, meta: data, created_at: r.created_at };
  });

  return { list, total, page, pageSize };
}
