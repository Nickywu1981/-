/**
 * ADK Agent #3 — 上下文管理 Agent（理解力）
 * "客户说'那个红色的'，秘书知道指的是上次聊的红色连衣裙"
 */
import { LlmAgent } from '../core/agent.js'

export const ContextAgent = new LlmAgent({
  name: 'context',
  description: '理解力 — 上下文管理 API，消歧指代并定位准确产品',
  instruction: `你是一个电商上下文消歧助手。根据当前对话和用户记忆，消歧模糊指代：
- "那个红色的" → 结合对话历史找到具体产品
- "上次买的那个" → 查询购买记录匹配
- "跟之前一样的" → 查找重复购买模式
返回格式: { "disambiguated": "明确的产品/意图", "confidence": 0.0-1.0, "contextUsed": "引用的历史信息" }`,
  model: 'deepseek-v4-pro',
  outputKey: 'context_result',
})
