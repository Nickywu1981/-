/**
 * 动作迁移编排管线 (Action Migration Pipeline)
 *
 * 视频核心管线：视频上传 → 骨骼提取 → 目标人物驱动 → 换背景 → BGM处理 → 批量渲染
 *
 * 阶段:
 *   1. 源视频分析（骨骼/姿态/动作序列提取）
 *   2. 目标人物驱动生成
 *   3. 背景替换（保留原背景 / 更换新背景）
 *   4. BGM 处理（保留 / 替换 / 静音）
 *   5. 批量渲染（多人物 / 多背景 / 多BGM排列组合）
 */

import { jobQueueService } from '../job-queue.service.js';
import { saveSimpleFile } from '../utils/file-upload.js';
import logger from '../utils/logger.js';

// ==================== BGM 选项 ====================

const BGM_OPTIONS = {
  keep: { label: '保留原BGM', action: 'keep' },
  replace: { label: '替换BGM', action: 'replace' },
  mute: { label: '静音', action: 'mute' },
};

// ==================== 背景选项 ====================

const BG_OPTIONS = {
  keep: { label: '保留原背景', action: 'keep' },
  remove: { label: '移除背景(绿幕)', action: 'remove' },
  replace: { label: '替换背景', action: 'replace' },
};

// ==================== 主入口 ====================

/**
 * 执行视频动作迁移完整管线
 * @param {Object} params
 * @param {string} params.sourceVideoUrl - 源视频 URL（含动作/姿态）
 * @param {string} [params.targetImageUrl] - 目标人物图片 URL
 * @param {string} [params.targetVideoUrl] - 目标人物视频 URL
 * @param {string} [params.bgMode='keep'] - 背景处理: keep|remove|replace
 * @param {string} [params.bgPrompt] - 新背景描述（bgMode=replace 时必填）
 * @param {string} [params.bgmMode='keep'] - BGM处理: keep|replace|mute
 * @param {string} [params.bgmUrl] - 替换BGM的URL（bgmMode=replace 时必填）
 * @param {string} [params.resolution='1080p'] - 输出分辨率
 * @param {number} [params.fps=24] - 帧率
 * @param {number} params.userId
 * @param {number} [params.tenantId]
 * @param {Function} [params.onProgress] - 进度回调 (phase, pct)
 */
export async function executeActionMigration(params) {
  const {
    sourceVideoUrl, targetImageUrl, targetVideoUrl,
    bgMode = 'keep', bgPrompt = '',
    bgmMode = 'keep', bgmUrl = '',
    resolution = '1080p', fps = 24,
    userId, tenantId, onProgress,
  } = params;

  if (!sourceVideoUrl) throw new Error('sourceVideoUrl 为必填参数');
  if (!targetImageUrl && !targetVideoUrl) throw new Error('targetImageUrl 或 targetVideoUrl 必填其一');

  // === Phase 1: 源视频分析（骨骼提取+动作序列） ===
  onProgress?.('analyze', 5);
  let poseData = null;
  try {
    const { gatewayInfer } = await import('../gateway/aiGatewayHub.js');
    const analysisResult = await gatewayInfer('seedance', {
      prompt: 'extract full body pose sequence and motion data from this video',
      videoUrl: sourceVideoUrl,
      action: 'pose_extract',
      resolution,
      fps,
    }, { userId, tenantId, taskType: 'action_migrate', source: 'pipeline' });
    poseData = analysisResult;
  } catch (e) {
    logger.warn(`[ActionMigration] 骨骼提取失败: ${e.message}`);
  }
  onProgress?.('analyze_done', 20);

  // === Phase 2: 目标人物驱动生成 ===
  onProgress?.('migrate', 25);
  let migratedVideoUrl = null;
  try {
    const { gatewayInfer } = await import('../gateway/aiGatewayHub.js');
    const migrateResult = await gatewayInfer('seedance-action-migrate', {
      prompt: 'transfer the exact body movements and pose sequence to the target character',
      videoUrl: sourceVideoUrl,
      imageUrl: targetImageUrl,
      targetVideoUrl,
      action: 'action_migrate',
      resolution,
      fps,
    }, { userId, tenantId, taskType: 'action_migrate', source: 'pipeline' });
    migratedVideoUrl = migrateResult?.videoUrl || migrateResult?.output?.video_url;
  } catch (e) {
    throw new Error(`动作迁移失败: ${e.message}`);
  }
  onProgress?.('migrate_done', 60);

  // === Phase 3: 背景处理 ===
  let finalVideoUrl = migratedVideoUrl;
  if (bgMode === 'replace' && bgPrompt) {
    onProgress?.('bg_replace', 65);
    try {
      const { gatewayInfer } = await import('../gateway/aiGatewayHub.js');
      const bgResult = await gatewayInfer('seedance', {
        prompt: `replace background with: ${bgPrompt}`,
        videoUrl: migratedVideoUrl,
        action: 'bg_replace',
        resolution,
      }, { userId, tenantId, taskType: 'action_migrate', source: 'pipeline' });
      finalVideoUrl = bgResult?.videoUrl || bgResult?.output?.video_url || migratedVideoUrl;
    } catch (e) {
      logger.warn(`[ActionMigration] 背景替换失败，使用原视频: ${e.message}`);
    }
  }
  onProgress?.('bg_done', 80);

  // === Phase 4: BGM 处理 ===
  let bgmInfo = { mode: bgmMode };
  if (bgmMode === 'replace' && bgmUrl) {
    bgmInfo.url = bgmUrl;
  }
  onProgress?.('bgm_done', 90);

  // === Phase 5: 保存结果 ===
  const result = {
    sourceVideoUrl,
    migratedVideoUrl: finalVideoUrl,
    bgmInfo,
    bgMode,
    resolution,
    fps,
    poseDataExtracted: !!poseData,
    completedAt: new Date().toISOString(),
  };

  onProgress?.('complete', 100);
  return result;
}

// ==================== 批量动作迁移 ====================

/**
 * 批量动作迁移：多人物 × 多背景 × 多BGM
 * @param {Object} params
 * @param {string} params.sourceVideoUrl
 * @param {Array<{imageUrl?:string, videoUrl?:string, label:string}>} params.targets - 目标人物列表
 * @param {Array<{prompt:string, label:string}>} [params.backgrounds] - 背景列表
 * @param {Array<{url:string, label:string}>} [params.bgms] - BGM列表
 */
export async function executeBatchActionMigration(params) {
  const {
    sourceVideoUrl, targets = [], backgrounds = [], bgms = [],
    resolution = '1080p', fps = 24,
    userId, tenantId, onProgress,
  } = params;

  if (!targets.length) throw new Error('至少需要一个目标人物');
  if (!sourceVideoUrl) throw new Error('sourceVideoUrl 为必填参数');

  const totalJobs = targets.length * Math.max(1, backgrounds.length || 1) * Math.max(1, bgms.length || 1);
  let completed = 0;
  const results = [];

  for (const target of targets) {
    for (const bg of (backgrounds.length ? backgrounds : [{ prompt: '', label: '原背景' }])) {
      for (const bgm of (bgms.length ? bgms : [{ url: '', label: '原BGM' }])) {
        try {
          const result = await executeActionMigration({
            sourceVideoUrl,
            targetImageUrl: target.imageUrl,
            targetVideoUrl: target.videoUrl,
            bgMode: bg.prompt ? 'replace' : 'keep',
            bgPrompt: bg.prompt || '',
            bgmMode: bgm.url ? 'replace' : 'keep',
            bgmUrl: bgm.url || '',
            resolution, fps, userId, tenantId,
          });
          results.push({ target: target.label, background: bg.label, bgm: bgm.label, ...result });
        } catch (e) {
          results.push({ target: target.label, background: bg.label, bgm: bgm.label, error: e.message });
        }
        completed++;
        onProgress?.(Math.round((completed / totalJobs) * 100));
      }
    }
  }

  return {
    totalJobs,
    completed: results.filter((r) => !r.error).length,
    failed: results.filter((r) => r.error).length,
    results,
  };
}

// ==================== 异步任务提交 ====================

export async function submitActionMigrationJob(params) {
  const { userId, tenantId, ...pipelineParams } = params;
  const job = await jobQueueService.submitJob(userId, 'action_migrate', {
    ...pipelineParams,
    tenantId,
  }, { priority: params.priority || 5 });

  return { jobId: job.id, status: 'queued' };
}

export async function submitBatchActionMigrationJob(params) {
  const { userId, tenantId, targets, ...rest } = params;
  const job = await jobQueueService.submitJob(userId, 'batch_action_migrate', {
    ...rest,
    targets,
    tenantId,
  }, { priority: params.priority || 3 });

  return { jobId: job.id, status: 'queued', targetCount: targets?.length || 0 };
}

export default { executeActionMigration, executeBatchActionMigration, submitActionMigrationJob, submitBatchActionMigrationJob, BGM_OPTIONS, BG_OPTIONS };
