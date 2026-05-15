/**
 * ADK 服务 — Context Compaction（上下文压缩）
 *
 * 借鉴 OpenClaw 的"记忆巩固"机制：
 *   接近上下文窗口上限 → LLM 摘要提炼 → 替换原始内容 → 节省 80% Token
 *
 * 触发策略：
 *   1. 自动：events 数量 > COMPACT_THRESHOLD (默认 30)
 *   2. 手动：runner.compactContext(session)
 */
import logger from '../../utils/logger.js';

/** events 数量超过此值自动触发压缩 */
const COMPACT_THRESHOLD = 30;

/** 压缩后保留最近 N 条 event（不压缩，保留实时性） */
const KEEP_RECENT = 5;

/**
 * 执行上下文压缩
 * @param {{ events: Array<{type: string, content: string}>, state: object }} session
 * @returns {Promise<{ summary: string, compactedCount: number, compressed: boolean }>}
 */
export async function compactContext(session) {
  const events = session.events || [];
  const totalCount = events.length;

  if (totalCount <= COMPACT_THRESHOLD) {
    return { summary: null, compactedCount: 0, compressed: false };
  }

  // 保留最近 KEEP_RECENT 条不动
  const keepIdx = Math.max(0, totalCount - KEEP_RECENT);
  const toCompact = events.slice(0, keepIdx);
  const toKeep = events.slice(keepIdx);

  if (toCompact.length === 0) {
    return { summary: null, compactedCount: 0, compressed: false };
  }

  try {
    const summary = await _generateSummary(toCompact, session.state);
    const compactedCount = toCompact.length;

    // 替换 events：一个 summary event + 保留的 recent events
    const summaryEvent = {
      type: 'system.compaction',
      content: summary,
      compactedCount,
      timestamp: Date.now(),
    };

    session.events = [summaryEvent, ...toKeep];
    session._lastCompaction = { at: Date.now(), compactedCount, remainingEvents: session.events.length };

    logger.info(`[ContextCompaction] Compressed ${compactedCount} events → ${session.events.length} (${Math.round((1 - session.events.length / totalCount) * 100)}% reduction)`);

    return { summary, compactedCount, compressed: true };
  } catch (err) {
    logger.error('[ContextCompaction] Compaction failed:', err.message);
    return { summary: null, compactedCount: 0, compressed: false };
  }
}

/**
 * 用 LLM 生成结构化摘要
 */
async function _generateSummary(events, state) {
  const { gatewayRoute } = await import('../../gateway/aiGatewayHub.js');

  // 构建历史摘要
  const userInputs = [];
  const agentOutputs = [];
  const toolCalls = [];
  const errors = [];

  for (const e of events) {
    if (!e || !e.type) continue;
    const content = typeof e.content === 'string' ? e.content.slice(0, 300) : JSON.stringify(e.content || '').slice(0, 300);

    if (e.type.includes('user.input') || e.type === 'user.input') {
      userInputs.push(content);
    } else if (e.type.includes('agent.output') || e.type === 'agent.output' || e.type.includes('result')) {
      agentOutputs.push({ type: e.type, summary: content });
    } else if (e.type.includes('tool') || e.type === 'tool.call' || e.type === 'tool.result') {
      toolCalls.push({ type: e.type, summary: content });
    } else if (e.type.includes('error') || content.includes('error') || content.includes('failed')) {
      errors.push(content);
    }
  }

  const stateSummary = state && state.getAll ? JSON.stringify(state.getAll()) : JSON.stringify(state || {});

  const prompt = `你是一个会话压缩助手。将以下 Agent 会话历史压缩为结构化摘要。保留关键信息，丢弃冗余。

历史统计:
- 用户输入次数: ${userInputs.length}
- Agent 输出次数: ${agentOutputs.length}
- 工具调用次数: ${toolCalls.length}
- 错误次数: ${errors.length}

用户输入摘要:
${userInputs.map((u, i) => `${i + 1}. ${u}`).join('\n')}

Agent 输出摘要:
${agentOutputs.map(o => `[${o.type}] ${o.summary}`).join('\n')}

${toolCalls.length > 0 ? `关键工具调用:\n${toolCalls.map(t => `[${t.type}] ${t.summary}`).join('\n')}` : ''}

${errors.length > 0 ? `错误记录:\n${errors.map(e => `- ${e}`).join('\n')}` : ''}

当前状态:
${stateSummary.slice(0, 500)}

请返回 JSON 格式的压缩摘要:
{
  "userIntent": "用户的原始意图和需求（1句话）",
  "keyDecisions": ["决策1", "决策2"],
  "completedTasks": ["已完成任务1", "已完成任务2"],
  "currentProgress": "当前进行到哪一步",
  "unresolvedItems": ["未解决问题1"],
  "contextForNext": "下一步需要的上下文信息（1-2句话）"
}`;

  const result = await gatewayRoute({
    mode: 'single',
    taskType: 'text_gen',
    params: {
      model: 'qwen-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      maxTokens: 500,
    },
  });

  const raw = result?.output?.choices?.[0]?.message?.content || '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return _fallbackSummary(events);

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return _fallbackSummary(events);
  }
}

/** 降级摘要 — 不调 LLM，纯规则压缩 */
function _fallbackSummary(events) {
  const types = {};
  for (const e of events) {
    if (!e) continue;
    const t = e.type || 'unknown';
    types[t] = (types[t] || 0) + 1;
  }
  return JSON.stringify({
    totalEvents: events.length,
    eventTypes: types,
    note: 'Fallback compaction (LLM unavailable)',
  });
}

export default { compactContext, COMPACT_THRESHOLD, KEEP_RECENT };
