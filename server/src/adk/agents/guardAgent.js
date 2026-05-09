/**
 * ADK Agent #6 — 风控合规 Agent（风控力）
 * "五层敏感词过滤，零违规处罚，比合规经理更严谨"
 */
import { LlmAgent } from '../core/agent.js';
import { FunctionTool } from '../core/tool.js';

const checkTextTool = new FunctionTool('check_text_compliance', async (params) => {
  const { default: service } = await import('../../services/sensitiveWordService.js');
  return service.scan(params.text, { level: params.level || 5 });
}, {
  description: '五层敏感词过滤扫描',
  parameters: {
    text: { type: 'string', description: '待检测文本' },
    level: { type: 'number', description: '过滤层级 1-5，默认 5 全覆盖' },
  },
});

export const GuardAgent = new LlmAgent({
  name: 'guard',
  description: '风控力 — 合规 API，五层敏感词过滤，零违规',
  instruction: `你是一个电商合规审核专家。对内容进行全面合规检查：
- Layer 1: 政治敏感词
- Layer 2: 色情低俗
- Layer 3: 虚假宣传/极限词（"最好""第一""绝对"）
- Layer 4: 平台违禁品
- Layer 5: 广告法合规
返回格式: { "passed": true/false, "riskLevel": "safe|low|medium|high|blocked", "violations": [...], "suggestion": "修改建议" }`,
  model: 'deepseek-v4-pro',
  tools: [checkTextTool],
  outputKey: 'guard_result',
});
