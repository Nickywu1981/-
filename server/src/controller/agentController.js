/**
 * 电商全能AI Agent 控制器
 * 6 Agent 协同 + 4 条业务链路 + 人工微调
 */
import { runEcommercePipeline, rerunSingleAgent } from '../adk/orchestration/ecommerceOrchestrator.js';
import { INTENT_TYPES } from '../services/intentClassifier.js';
import { wrapController } from '../utils/wrapController.js';
import { success, error, Errors } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import logger from '../utils/logger.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 全链路生成 ====================

export const generate = wrapController(async (req) => {
  const { userInput, productName, imageUrl, referenceVideoUrl, platform, industry, videoDuration, needsVoice, extra } = req.body;
  const userId = req.user?.id;

  const result = await runEcommercePipeline({
    userInput,
    productName,
    imageUrl,
    referenceVideoUrl,
    platform,
    industry,
    userId,
    ip: req.ip,
    videoDuration: videoDuration || 30,
    needsVoice: needsVoice || false,
    extra,
  });

  logger.info('[EcommerceController] Generate complete', {
    userId,
    pipeline: result.pipeline,
    intentId: result.intent?.id,
  });

  return result;
});

// ==================== 人工微调 ====================

export const tweakAgent = wrapController(async (req) => {
  const { agentName } = req.params;
  const { state, userId } = req.body;

  logger.info('[EcommerceController] Tweak agent', { agentName, userId });

  const result = await rerunSingleAgent(agentName, {
    userId: userId || req.user?.id,
    state: {
      ...state,
      userId: userId || req.user?.id,
    },
  });

  return { agentName, result };
});

// ==================== 参考上传 ====================

export const uploadReference = wrapController(async (req) => {
  const file = req.file;
  const { type } = req.body;

  if (!file) {
    throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  }

  const url = `/uploads/${file.filename}`;

  logger.info('[EcommerceController] Reference uploaded', { type, url });

  return {
    url,
    type: type || 'image',
    filename: file.originalname,
    size: file.size,
  };
});

// ==================== 查询接口 ====================

export const listIntents = wrapController(async () => {
  const intents = Object.entries(INTENT_TYPES).map(([key, val]) => ({
    key,
    id: val.id,
    category: val.category,
    label: val.label,
  }));

  return intents;
});

export const listIndustries = wrapController(async () => {
  return [
    { key: 'clothing', label: '服装' },
    { key: 'beauty', label: '美妆' },
    { key: '3c_digital', label: '3C数码' },
    { key: 'food', label: '食品' },
    { key: 'home', label: '家居' },
  ];
});

export const getPipelineStatus = wrapController(async (req) => {
  const { taskId } = req.params;

  const { getTaskStatus } = await import('../services/taskService.js');
  return await getTaskStatus(taskId);
});

// ==================== 配置清单 ====================

export const getConfig = wrapController(async () => {
  return {
    industries: [
      { key: 'clothing', label: '服装' },
      { key: 'beauty', label: '美妆' },
      { key: '3c_digital', label: '3C数码' },
      { key: 'food', label: '食品' },
      { key: 'home', label: '家居' },
    ],
    platforms: [
      { key: 'taobao', label: '淘宝/天猫' },
      { key: 'douyin', label: '抖音' },
      { key: 'jd', label: '京东' },
      { key: 'kuaishou', label: '快手' },
    ],
    styles: [
      { key: 'professional', label: '专业商务' },
      { key: 'minimalist', label: '极简风' },
      { key: 'lifestyle', label: '生活方式' },
      { key: 'trendy', label: '潮流时尚' },
      { key: 'cute', label: '可爱清新' },
    ],
    videoDurations: [15, 30, 60],
    storyboardCounts: [5, 6, 7, 8],
    voiceOptions: [
      { key: 'zh-CN-XiaoxiaoNeural', label: '晓晓(女)' },
      { key: 'zh-CN-YunxiNeural', label: '云希(男)' },
      { key: 'zh-CN-XiaoyiNeural', label: '晓伊(女)' },
    ],
    modelOptions: [
      { key: 'auto', label: '智能调度' },
      { key: 'gpt-image-2', label: 'GPT Image' },
      { key: 'deepseek-v4-pro', label: 'DeepSeek V4' },
      { key: 'qwen-turbo', label: '通义千问' },
      { key: 'claude-sonnet-4-6', label: 'Claude Sonnet' },
    ],
  };
});
