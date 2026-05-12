/**
 * 超长上下文窗口管理服务 (Context Window Manager)
 *
 * 功能：
 * 1. Token 预算计算 — 按模型 max_tokens 分配 system/history/RAG/user/reserved
 * 2. 滑动窗口 — 超出预算时按 FIFO + 重要性裁剪历史消息
 * 3. 增量摘要 — 裁剪的消息先压缩为摘要注入，保留关键信息
 * 4. 分块策略 — 超长输入自动分块，逐块推理 + 结果合并
 * 5. 窗口快照 — 每次调用记录窗口状态到 context_snapshots
 */

import db from '../dao/db.js';

// 各模型默认 Token 上限
const MODEL_TOKEN_LIMITS = {
  'gpt-4o': 128000,
  'gpt-4-turbo': 128000,
  'gpt-3.5-turbo': 16385,
  'claude-sonnet-4-6': 200000,
  'claude-haiku-4-5': 200000,
  'claude-opus-4-7': 200000,
  'deepseek-v4-pro': 128000,
  'gemini-2.0-flash': 1048576,
  default: 8192,
};

// Token 预算分配比例
const BUDGET_RATIOS = {
  system: 0.10,   // 系统提示占 10%
  reserved: 0.20, // 输出预留 20%
  rag: 0.10,      // RAG 内容最多 10%
  history: 0.40,  // 历史消息最多 40%
  user: 0.20,     // 用户输入至少 20%
};

// 粗估 Token 数 (英文 1 token ≈ 4 chars, 中文 1 token ≈ 1.5 chars)
function estimateTokens(text) {
  if (!text) return 0;
  const cnChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - cnChars;
  return Math.ceil(cnChars / 1.5 + otherChars / 4);
}

function getModelLimit(modelId) {
  for (const [key, limit] of Object.entries(MODEL_TOKEN_LIMITS)) {
    if (modelId && modelId.toLowerCase().includes(key.toLowerCase())) return limit;
  }
  return MODEL_TOKEN_LIMITS.default;
}

// ─── 分块策略 ───────────────────────────────────────────────

function chunkText(text, maxChunkTokens = 16000, overlapTokens = 800) {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';
  let currentTokens = 0;

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);
    if (currentTokens + paraTokens > maxChunkTokens && current) {
      chunks.push(current.trim());
      // 重叠：保留最后一段作为上下文衔接
      const overlapPara = current.split('\n\n').slice(-2).join('\n\n');
      current = overlapPara + '\n\n' + para;
      currentTokens = estimateTokens(current);
    } else {
      current = current ? current + '\n\n' + para : para;
      currentTokens += paraTokens;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ─── 滑动窗口裁剪 ───────────────────────────────────────────

function slidingWindow(messages, maxHistoryTokens, importanceMap = {}) {
  if (messages.length === 0) return { kept: [], pruned: [], prunedTokens: 0 };

  // 从最新往前累计，超出预算的裁剪
  let accumulated = 0;
  const kept = [];
  const pruned = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(
      typeof messages[i] === 'string' ? messages[i] : messages[i].content || ''
    );
    const importance = importanceMap[i] || 0;

    // 重要消息即使超出预算也保留（但要有上限）
    if (importance > 0.8 && kept.length < 20) {
      kept.unshift(messages[i]);
      accumulated += msgTokens;
      continue;
    }

    if (accumulated + msgTokens <= maxHistoryTokens) {
      kept.unshift(messages[i]);
      accumulated += msgTokens;
    } else {
      pruned.unshift(messages[i]);
    }
  }

  return {
    kept,
    pruned,
    prunedTokens: pruned.reduce((sum, m) =>
      sum + estimateTokens(typeof m === 'string' ? m : m.content || ''), 0),
  };
}

// ─── 增量摘要生成 (降级版，无 LLM 时用) ─────────────────────

function fallbackSummarize(messages) {
  if (messages.length === 0) return '';
  const texts = messages.map(m =>
    typeof m === 'string' ? m : m.content || ''
  ).filter(Boolean);

  // 提取首句作为关键点
  const points = texts.map(t => {
    const firstSentence = t.split(/[。！？\n.!?]/)[0];
    return firstSentence.length > 80 ? firstSentence.slice(0, 80) + '…' : firstSentence;
  });

  // 去重 + 最多保留 10 个点
  const unique = [...new Set(points)].slice(0, 10);
  return `[对话摘要] ${unique.join('；')}`;
}

// ─── Token 预算计算 ─────────────────────────────────────────

function calculateBudget(modelId, systemPrompt, historyMessages, ragContent, userInput) {
  const totalBudget = getModelLimit(modelId);
  const systemTokens = estimateTokens(systemPrompt);
  const userTokens = estimateTokens(userInput);
  const ragTokens = estimateTokens(ragContent);
  const historyTokens = historyMessages.reduce((s, m) =>
    s + estimateTokens(typeof m === 'string' ? m : m.content || ''), 0);

  const reserved = Math.floor(totalBudget * BUDGET_RATIOS.reserved);
  const maxHistory = Math.floor(totalBudget * BUDGET_RATIOS.history);
  const maxRag = Math.floor(totalBudget * BUDGET_RATIOS.rag);
  const maxSystem = Math.floor(totalBudget * BUDGET_RATIOS.system);
  const minUser = Math.floor(totalBudget * BUDGET_RATIOS.user);

  return {
    budget_total: totalBudget,
    system_prompt_tokens: Math.min(systemTokens, maxSystem),
    history_tokens: Math.min(historyTokens, maxHistory),
    rag_tokens: Math.min(ragTokens, maxRag),
    user_input_tokens: Math.max(userTokens, minUser),
    reserved_tokens: reserved,
    remaining_tokens: totalBudget - systemTokens - userTokens - reserved,
    overflow: Math.max(0,
      systemTokens + historyTokens + ragTokens + userTokens + reserved - totalBudget),
  };
}

// ─── 主入口：管理上下文窗口 ─────────────────────────────────

async function manageContextWindow({
  modelId,
  systemPrompt = '',
  historyMessages = [],
  ragContent = '',
  userInput = '',
  sessionId,
  importanceMap = {},
  callId,
}) {
  const budget = calculateBudget(modelId, systemPrompt, historyMessages, ragContent, userInput);
  const actualHistoryTokens = budget.history_tokens;
  let summaryInjected = '';
  let strategy = 'sliding';

  // 溢出时裁剪
  if (budget.overflow > 0) {
    const { kept, pruned, prunedTokens } = slidingWindow(historyMessages, actualHistoryTokens, importanceMap);

    if (pruned.length > 0) {
      summaryInjected = fallbackSummarize(pruned);
      // 把摘要注入到裁剪后的历史最前面
      if (summaryInjected) {
        kept.unshift({ role: 'system', content: summaryInjected });
      }
      strategy = 'summarize';
    }

    historyMessages = kept;
    budget.pruned_tokens = prunedTokens;
    budget.compression_ratio = prunedTokens > 0
      ? (1 - prunedTokens / (budget.history_tokens + prunedTokens)).toFixed(4)
      : null;
  }

  // 持久化窗口快照
  if (sessionId) {
    await saveContextSnapshot(sessionId, budget, historyMessages.length, strategy, modelId);
  }

  return {
    budget,
    historyMessages,
    summaryInjected,
    strategy,
    chunked: budget.overflow > 0 ? chunkText(userInput) : null,
  };
}

// ─── 持久化窗口快照 ─────────────────────────────────────────

async function saveContextSnapshot(sessionId, budget, messageCount, strategy, modelId) {
  try {
    const pool = db;
    // db available
    await db.execute(
      `INSERT INTO context_snapshots
        (session_id, total_tokens, model_max_tokens, utilization_pct,
         chunk_count, summary_tokens, pruned_tokens, message_count, strategy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        budget.budget_total - budget.remaining_tokens,
        budget.budget_total,
        budget.budget_total > 0
          ? ((budget.budget_total - budget.remaining_tokens) / budget.budget_total * 100).toFixed(2)
          : 0,
        budget.chunk_count || 1,
        budget.rag_tokens || 0,
        budget.pruned_tokens || 0,
        messageCount,
        strategy,
      ]
    );
  } catch (_) { /* 快照失败不影响主流程 */ }
}

// ─── 保存 Token 预算日志 ────────────────────────────────────

async function saveBudgetLog(sessionId, budget, callId) {
  try {
    const pool = db;
    if (!pool || !sessionId) return;
    await db.execute(
      `INSERT INTO token_budget_log
        (session_id, call_id, budget_total, system_prompt_tokens,
         history_tokens, rag_tokens, user_input_tokens, reserved_tokens,
         remaining_tokens, overflow_truncated, compression_ratio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId, callId || null, budget.budget_total, budget.system_prompt_tokens,
        budget.history_tokens, budget.rag_tokens, budget.user_input_tokens,
        budget.reserved_tokens, budget.remaining_tokens,
        budget.pruned_tokens || 0, budget.compression_ratio || null,
      ]
    );
  } catch (_) { /* 日志失败不影响主流程 */ }
}

export {
  estimateTokens,
  getModelLimit,
  chunkText,
  slidingWindow,
  fallbackSummarize,
  calculateBudget,
  manageContextWindow,
  saveBudgetLog,
  BUDGET_RATIOS,
  MODEL_TOKEN_LIMITS,
};
