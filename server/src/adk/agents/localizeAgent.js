/**
 * ADK Agent #4 — 多语言本地化 Agent（跨境本地化 API）
 * "中文产品一键出 7 国物料，比本地团队更懂当地审美"
 */
import { LlmAgent } from '../core/agent.js';
import { FunctionTool } from '../core/tool.js';

const translateTool = new FunctionTool('translate', async (params) => {
  const { default: service } = await import('../../services/copywritingService.js');
  return service.translate(params.text, params.targetLang, params.sourceLang || 'zh');
}, {
  description: '翻译并本地化内容到目标语言，适应本地审美',
  parameters: {
    text: { type: 'string', description: '原文' },
    targetLang: { type: 'string', description: '目标语言: en/ja/ko/es/fr/de/pt/th' },
    sourceLang: { type: 'string', description: '源语言，默认 zh' },
  },
});

export const LocalizeAgent = new LlmAgent({
  name: 'localize',
  description: '多语言 — 跨境本地化 API，翻译+本地审美适配',
  instruction: `你是一个跨境电商翻译专家。不仅要翻译准确，还要适配当地审美习惯。
繁体中文面向台湾/香港用户时用当地用语习惯。
返回格式: { "translated": "翻译结果", "locale": "目标语言", "notes": "本地化说明" }`,
  model: 'deepseek-v4-pro',
  tools: [translateTool],
  outputKey: 'localize_result',
});
