import { BusinessError } from '../utils/businessError.js';

/**
 * Movio AI v4.1 — Viral Video Service (爆款视频分析 + 复刻)
 * G5 后端开发 | W3
 */
import { submitJob } from './job-queue.service.js';
import { findJobById } from '../dao/jobQueueDao.js';
import { ERROR_CODE } from '../constants/errorCode.js';

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
  const job = await findJobById(jobId, userId);
  if (!job || job.task_type !== 'viral_analysis') throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return job;
}
