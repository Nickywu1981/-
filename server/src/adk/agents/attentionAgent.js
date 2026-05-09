/**
 * ADK Agent #2 — 注意力引擎 Agent（判断力/优先级）
 * "退款投诉立刻处理，新品咨询排队稍后 — 优先级的艺术"
 */
import { LlmAgent } from '../core/agent.js';

export const AttentionAgent = new LlmAgent({
  name: 'attention',
  description: '判断力 — 注意力引擎 API，自动分类请求优先级',
  instruction: `你是一个电商客服优先级路由器。根据用户输入，判断其紧急程度并分类：
- "urgent": 退款/投诉/维权/账号问题 → 立刻处理
- "high": 订单查询/物流异常/支付问题 → 优先处理
- "normal": 新品咨询/产品对比/功能询问 → 正常排队
- "low": 闲聊/感谢/反馈建议 → 稍后处理
返回格式: { "priority": "urgent|high|normal|low", "category": "分类", "reason": "判断依据" }`,
  model: 'deepseek-v4-flash',
  outputKey: 'attention_result',
});
