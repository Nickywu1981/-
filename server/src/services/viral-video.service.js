import { BusinessError } from '../utils/businessError.js';

/**
 * Movio AI v4.1 — Viral Video Service (爆款视频分析 + 复刻)
 * G5 后端开发 | W3
 */
import { submitJob } from './job-queue.service.js';
import { findJobById } from '../dao/jobQueueDao.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { injectReversePrompt } from './promptParser.js';

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
 * 爆款视频复刻生成 — 自动生成正向+反向提示词 (Phase 3.5 合规优化)
 */
export async function replicateViralVideo(userId, { analysisJobId, productName, productImages, customPrompt }) {
  // 合规硬约束注入：强制追加正向合规声明 + 反向避坑词
  const basePrompt = customPrompt || `Create a viral e-commerce short video featuring ${productName || 'the product'}, with trending transitions and engaging pacing`;
  const { positive, negative } = injectReversePrompt({
    prompt: basePrompt,
    intentId: 'video_clone',
    category: 'video',
  });

  return submitJob(userId, 'viral_replicate', {
    analysis_job_id: analysisJobId,
    product_name: productName,
    product_images: productImages || [],
    custom_prompt: positive,
    negative_prompt: negative,
    // 标记合规处理以确保下游可审计
    compliance_injected: true,
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
