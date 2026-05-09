/**
 * ADK Agent #5 — 内容生成 Agent（写作力）
 * "标题/卖点/详情/直播脚本 — 比文案更懂转化率"
 */
import { LlmAgent } from '../core/agent.js';
import { FunctionTool } from '../core/tool.js';

const titleGenTool = new FunctionTool('generate_titles', async (params) => {
  const { default: service } = await import('../../services/copywritingService.js');
  return service.generateTitles(params.productName, params.platform, params.count || 5);
}, {
  description: '生成电商商品标题，带平台适配和转化词优化',
  parameters: {
    productName: { type: 'string', description: '商品名称' },
    platform: { type: 'string', description: '平台: taobao/jd/douyin/shopee/tiktok' },
    count: { type: 'number', description: '生成数量' },
  },
});

const sellingPointTool = new FunctionTool('generate_selling_points', async (params) => {
  const { default: service } = await import('../../services/copywritingService.js');
  return service.generateSellingPoints(params.productName, params.platform, params.count || 5);
}, {
  description: '生成卖点文案，突出转化关键词',
  parameters: {
    productName: { type: 'string', description: '商品名称' },
    platform: { type: 'string', description: '平台' },
    count: { type: 'number', description: '生成数量' },
  },
});

const scriptTool = new FunctionTool('generate_script', async (params) => {
  const { default: service } = await import('../../services/copywritingService.js');
  return service.generateScript(params.productName, params.platform, params.duration || 60);
}, {
  description: '生成带货直播/短视频脚本',
  parameters: {
    productName: { type: 'string', description: '商品名称' },
    platform: { type: 'string', description: '平台: douyin/tiktok' },
    duration: { type: 'number', description: '视频时长(秒)' },
  },
});

export const ContentAgent = new LlmAgent({
  name: 'content',
  description: '写作力 — 内容生成 API，标题/卖点/详情/脚本',
  instruction: `你是一个电商文案专家，深谙各大平台转化率优化。
根据商品名和平台生成高转化率文案，包含emoji和平台特色用语。
返回格式: { "titles": [...], "sellingPoints": [...], "script": "...", "platformNotes": "平台适配说明" }`,
  model: 'deepseek-v4-pro',
  tools: [titleGenTool, sellingPointTool, scriptTool],
  outputKey: 'content_result',
});
