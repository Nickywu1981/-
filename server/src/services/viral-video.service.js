import { BusinessError } from '../utils/businessError.js';

/**
 * Movio AI v4.1 — Viral Video Service (爆款视频分析 + 复刻)
 * G5 后端开发 | W3
 */
import { submitJob } from './job-queue.service.js';
import * as moderation from './moderation.service.js';
import db from '../dao/db.js';

/**
 * 爆款视频分析
 */
export async function analyzeViralVideo(userId, { videoUrl, platform = 'douyin' }) {
  return submitJob(userId, 'viral_analysis', {
    video_url: videoUrl,
    platform,
  }, { priority: 4 });
}

/**
 * 爆款视频复刻生成
 */
export async function replicateViralVideo(userId, { analysisJobId, productName, productImages, customPrompt }) {
  return submitJob(userId, 'viral_replicate', {
    analysis_job_id: analysisJobId,
    product_name: productName,
    product_images: productImages || [],
    custom_prompt: customPrompt,
  }, { priority: 4 });
}

/**
 * 获取分析结果
 */
export async function getViralAnalysis(jobId, userId) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, status, progress, result_data, created_at FROM job_queue WHERE id = ? AND user_id = ? AND task_type = ?',
      [jobId, userId, 'viral_analysis'],
    );
    if (rows.length === 0) throw new BusinessError(404, '分析任务不存在');
    return rows[0];
  } finally {
    conn.release();
  }
}
