/**
 * ADK Agent #2 — 合规安全 Agent（守护力）
 * "全局校验广告法、违禁词、平台规范、PII脱敏、地域校验"
 *
 * 桥接 adComplianceEngine.js + geoGuardService.js + inputSanitizerService.js
 * 五层安全防线：GEO → 广告法 → 平台规范 → 行业管控 → PII脱敏
 */
import { LlmAgent } from '../core/agent.js';
import { FunctionTool } from '../core/tool.js';
import { checkCompliance } from '../../services/adComplianceEngine.js';

const complianceTool = new FunctionTool('check_compliance', async (params) => {
  const result = checkCompliance(params.text, {
    platform: params.platform || 'taobao',
    industry: params.industry,
    strict: params.strict || false,
  });
  return result;
}, {
  description: '执行三级合规校验：广告法禁用词 + 平台违禁词 + 行业敏感词',
  parameters: {
    text: { type: 'string', description: '待校验文本' },
    platform: { type: 'string', description: '平台: taobao|douyin|jd|kuaishou' },
    industry: { type: 'string', description: '行业: clothing|beauty|3c_digital|food|home' },
    strict: { type: 'boolean', description: '严格模式(warn也拦截)' },
  },
});

const geoCheckTool = new FunctionTool('geo_check', async (params) => {
  const { geoGuard } = await import('../../services/geoGuardService.js');
  return geoGuard(params.ip, null, params.platform);
}, {
  description: 'GEO地域校验：IP→国家解析、区域封锁、就近路由',
  parameters: {
    ip: { type: 'string', description: '客户端IP' },
    platform: { type: 'string', description: '目标平台' },
  },
});

const sanitizePIITool = new FunctionTool('sanitize_pii', async (params) => {
  const { sanitizePII } = await import('../../services/inputSanitizerService.js');
  return sanitizePII(params.text);
}, {
  description: 'PII脱敏：自动识别并脱敏手机号/身份证/银行卡/邮箱',
  parameters: {
    text: { type: 'string', description: '待脱敏文本' },
  },
});

export const GuardAgent = new LlmAgent({
  name: 'guard',
  description: '守护力 — 五层安全防线（GEO+广告法+平台+行业+PII）',
  instruction: `你是一个电商内容安全合规审核专家。执行五层防线校验：

1. GEO地域校验 — 检查IP归属地，封禁地区拒绝服务
2. 广告法禁用词 — 检查"最好""第一""国家级"等禁用词
3. 平台规范 — 按淘宝/抖音/京东/快手专项规则检查
4. 行业管控 — 服装/美妆/3C/食品/家居特殊限制
5. PII脱敏 — 手机号/身份证/银行卡自动脱敏

对用户输入执行全部五层检查。若合规通过返回 { passed: true }；若不合规返回 { passed: false, violations: [...], sanitizedText: "..." }`,
  model: 'qwen-turbo',
  tools: [complianceTool, geoCheckTool, sanitizePIITool],
  outputKey: 'guard_result',
  generateContentConfig: { temperature: 0, maxOutputTokens: 500 },
});
