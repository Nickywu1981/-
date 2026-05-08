/**
 * Movio AI v4.1 — Action Migrate Service (动作迁移 — 全球独家杀手功能)
 * G5 后端开发 | W3
 * 单人动作迁移 / 批量动作迁移
 */
import { submitJob } from './job-queue.service.js';
import * as moderationService from './moderation.service.js';
import db from '../dao/db.js';

/**
 * 动作迁移 — 单人
 */
export async function migrateAction(userId, { sourceVideoUrl, targetPersonImage, options = {} }) {
  // 内容审核 (视频)
  const auditResult = await moderationService.moderateVideo(sourceVideoUrl, userId, { stage: 'input' });
  if (auditResult.action === 'block') throw { status: 422, message: '源视频包含违规内容' };

  return submitJob(userId, 'action_migrate', {
    source_video_url: sourceVideoUrl,
    target_person_image: targetPersonImage,
    options,
  }, { priority: 3 }); // 高优先级
}

/**
 * 批量动作迁移 — 全球独家
 */
export async function batchMigrateAction(userId, { sourceVideoUrls, targetPersonImages, options = {} }) {
  if (!sourceVideoUrls || sourceVideoUrls.length === 0) throw { status: 400, message: '请提供至少1个源视频' };
  if (!targetPersonImages || targetPersonImages.length === 0) throw { status: 400, message: '请提供至少1张目标人物图' };
  if (sourceVideoUrls.length > 10) throw { status: 400, message: '最多10个源视频' };
  if (targetPersonImages.length > 20) throw { status: 400, message: '最多20张目标人物图' };

  const totalJobs = sourceVideoUrls.length * targetPersonImages.length;
  if (totalJobs > 100) throw { status: 400, message: `批量上限100个任务，当前${totalJobs}个` };

  // 逐视频审核
  for (const url of sourceVideoUrls) {
    const auditResult = await moderationService.moderateVideo(url, userId, { stage: 'input' });
    if (auditResult.action === 'block') throw { status: 422, message: '源视频包含违规内容' };
  }

  return submitJob(userId, 'batch_action_migrate', {
    source_video_urls: sourceVideoUrls,
    target_person_images: targetPersonImages,
    options,
    total_jobs: totalJobs,
  }, { priority: 3 });
}

/**
 * 获取动作迁移任务进度 (含子任务)
 */
export async function getBatchMigrateProgress(jobId, userId) {
  const conn = await db.getConnection();
  try {
    const [parent] = await conn.query(
      'SELECT id, status, progress, result_data FROM job_queue WHERE id = ? AND user_id = ?',
      [jobId, userId],
    );
    if (parent.length === 0) throw { status: 404, message: '任务不存在' };

    // 查询子任务进度
    const [children] = await conn.query(
      "SELECT id, status, progress, result_data FROM job_queue WHERE task_type = 'action_migrate' AND JSON_EXTRACT(task_params, '$.batch_id') = ?",
      [String(jobId)],
    );

    return {
      ...parent[0],
      sub_tasks: children,
      completed_count: children.filter(c => c.status === 'completed').length,
      total_count: children.length,
    };
  } finally {
    conn.release();
  }
}
