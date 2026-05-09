/**
 * ADK Agent #7 — 视觉生成 Agent（视觉力）
 * "15s/30s TikTok 商品视频，100 SKU 并行 2 小时搞定"
 */
import { LlmAgent } from '../core/agent.js';
import { FunctionTool } from '../core/tool.js';

const imageGenTool = new FunctionTool('generate_image', async (params) => {
  const { default: service } = await import('../../services/image.service.js');
  return service.submitMainImage({
    productName: params.productName,
    style: params.style || 'ecommerce',
    userId: params.userId,
  });
}, {
  description: '生成电商商品图片/主图',
  parameters: {
    productName: { type: 'string', description: '商品名称' },
    style: { type: 'string', description: '风格' },
    userId: { type: 'number', description: '用户ID' },
  },
});

const videoGenTool = new FunctionTool('generate_video', async (params) => {
  const { default: service } = await import('../../services/video.service.js');
  return service.submitVideo({
    productName: params.productName,
    duration: params.duration || 15,
    platform: params.platform || 'tiktok',
    userId: params.userId,
  });
}, {
  description: '生成短视频广告',
  parameters: {
    productName: { type: 'string', description: '商品名称' },
    duration: { type: 'number', description: '时长 15/30/60 秒' },
    platform: { type: 'string', description: '平台' },
    userId: { type: 'number', description: '用户ID' },
  },
});

const batchTool = new FunctionTool('batch_generate', async (params) => {
  const { default: service } = await import('../../services/batch.service.js');
  return service.queue(params.skuList, params.type, params.userId);
}, {
  description: '批量并行生成，100 SKU 并行处理',
  parameters: {
    skuList: { type: 'string', description: 'SKU 列表 JSON 数组' },
    type: { type: 'string', description: '类型: image/video' },
    userId: { type: 'number', description: '用户ID' },
  },
});

export const VisualAgent = new LlmAgent({
  name: 'visual',
  description: '视觉力 — 图片/视频批量生成 API',
  instruction: `你是一个电商视觉内容生成专家。
根据商品名称和平台要求，生成对应的图片或视频内容。
支持单张生成和批量并行（100 SKU 同时处理）。
返回格式: { "taskId": "...", "type": "image|video|batch", "status": "queued", "estimateSeconds": N }`,
  model: 'deepseek-v4-pro',
  tools: [imageGenTool, videoGenTool, batchTool],
  outputKey: 'visual_result',
});
