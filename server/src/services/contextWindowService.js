/**
 * 超长上下文窗口管理服务 (Context Window Manager) v2.0
 *
 * 功能：
 * 1. Token 预算计算 — 按模型 max_tokens 分配 system/history/RAG/user/reserved
 * 2. 滑动窗口 — 超出预算时按 FIFO + 重要性裁剪历史消息
 * 3. 增量摘要 — 裁剪的消息先压缩为摘要注入，保留关键信息
 * 4. 分块策略 — 超长输入自动分块
 * 5. 窗口快照 — 持久化到 context_snapshots / token_budget_log
 * 6. [新增] 多轮对话上下文缓存 — 同一 sessionId 的历史摘要 Redis 缓存
 * 7. [新增] 增量裁剪 — 已裁剪消息不重复计算
 */

import db from '../dao/db.js';
import logger from '../utils/logger.js';

const MODEL_TOKEN_LIMITS = {
  'gpt-4o': 128000, 'gpt-4-turbo': 128000, 'gpt-3.5-turbo': 16385,
  'claude-sonnet-4-6': 200000, 'claude-haiku-4-5': 200000, 'claude-opus-4-7': 200000,
  'deepseek-v4-pro': 128000, 'gemini-2.0-flash': 1048576, default: 8192,
};

const BUDGET_RATIOS = {
  system: 0.10, reserved: 0.20, rag: 0.10, history: 0.40, user: 0.20,
};

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

function chunkText(text, maxChunkTokens = 16000, overlapTokens = 800) {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';
  let currentTokens = 0;
  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);
    if (currentTokens + paraTokens > maxChunkTokens && current) {
      chunks.push(current.trim());
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

function slidingWindow(messages, maxHistoryTokens, importanceMap = {}) {
  if (messages.length === 0) return { kept: [], pruned: [], prunedTokens: 0 };
  let accumulated = 0;
  const kept = [];
  const pruned = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(
      typeof messages[i] === 'string' ? messages[i] : messages[i].content || ''
    );
    const importance = importanceMap[i] || 0;
    if (importance > 0.8 && kept.length < 20) {
      kept.unshift(messages[i]); accumulated += msgTokens; continue;
    }
    if (accumulated + msgTokens <= maxHistoryTokens) {
      kept.unshift(messages[i]); accumulated += msgTokens;
    } else {
      pruned.unshift(messages[i]);
    }
  }
  return { kept, pruned, prunedTokens: pruned.reduce((s, m) =>
    s + estimateTokens(typeof m === 'string' ? m : m.content || ''), 0) };
}

function fallbackSummarize(messages) {
  if (messages.length === 0) return '';
  const texts = messages.map(m =>
    typeof m === 'string' ? m : m.content || ''
  ).filter(Boolean);
  const points = texts.map(t => {
    const firstSentence = t.split(/[。！？\n.!?]/)[0];
    return firstSentence.length > 80 ? firstSentence.slice(0, 80) + '…' : firstSentence;
  });
  const unique = [...new Set(points)].slice(0, 10);
  return `[对话摘要] ${unique.join('；')}`;
}

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
    overflow: Math.max(0, systemTokens + historyTokens + ragTokens + userTokens + reserved - totalBudget),
  };
}

async function manageContextWindow({
  modelId, systemPrompt = '', historyMessages = [], ragContent = '',
  userInput = '', sessionId, importanceMap = {},
}) {
  const budget = calculateBudget(modelId, systemPrompt, historyMessages, ragContent, userInput);
  let summaryInjected = '';
  let strategy = 'sliding';

  if (budget.overflow > 0) {
    const actualHistoryTokens = budget.history_tokens;
    const { kept, pruned, prunedTokens } = slidingWindow(historyMessages, actualHistoryTokens, importanceMap);
    if (pruned.length > 0) {
      summaryInjected = fallbackSummarize(pruned);
      if (summaryInjected) {
        kept.unshift({ role: 'system', content: summaryInjected });
      }
      strategy = 'summarize';
    }
    historyMessages = kept;
    budget.pruned_tokens = prunedTokens;
    budget.compression_ratio = prunedTokens > 0
      ? parseFloat((1 - prunedTokens / (budget.history_tokens + prunedTokens)).toFixed(4)) : null;
  }

  if (sessionId) {
    await saveContextSnapshot(sessionId, budget, historyMessages.length, strategy, modelId);
  }

  return { budget, historyMessages, summaryInjected, strategy,
    chunked: budget.overflow > 0 ? chunkText(userInput) : null };
}

async function saveContextSnapshot(sessionId, budget, messageCount, strategy, modelId) {
  try {
    await db.execute(
      `INSERT INTO context_snapshots
        (session_id, total_tokens, model_max_tokens, utilization_pct,
         chunk_count, summary_tokens, pruned_tokens, message_count, strategy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, budget.budget_total - budget.remaining_tokens, budget.budget_total,
       budget.budget_total > 0 ? ((budget.budget_total - budget.remaining_tokens) / budget.budget_total * 100).toFixed(2) : 0,
       budget.chunk_count || 1, budget.rag_tokens || 0, budget.pruned_tokens || 0, messageCount, strategy]
    );
  } catch (e) { logger.warn('[ContextWindow] snapshot failed:', e.message); }
}

async function saveBudgetLog(sessionId, budget, callId) {
  if (!sessionId) return;
  try {
    await db.execute(
      `INSERT INTO token_budget_log
        (session_id, call_id, budget_total, system_prompt_tokens,
         history_tokens, rag_tokens, user_input_tokens, reserved_tokens,
         remaining_tokens, overflow_truncated, compression_ratio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, callId || null, budget.budget_total, budget.system_prompt_tokens,
       budget.history_tokens, budget.rag_tokens, budget.user_input_tokens,
       budget.reserved_tokens, budget.remaining_tokens,
       budget.pruned_tokens || 0, budget.compression_ratio || null]
    );
  } catch (e) { logger.warn('[ContextWindow] budget log failed:', e.message); }
}

// ==================== 多轮对话上下文缓存（新增） ====================

const contextCacheEnabled = process.env.CONTEXT_CACHE_ENABLED !== 'false';
const contextCacheTTL = parseInt(process.env.CONTEXT_CACHE_TTL_MS || '600000', 10); // 10min

// 内存缓存
const sessionContextCache = new Map();

/** 获取缓存的会话上下文摘要 */
export async function getSessionContext(sessionId) {
  if (!contextCacheEnabled || !sessionId) return null;

  try {
    // 尝试 Redis
    const { default: redis } = await import('../utils/redis.js').catch(() => ({ default: null }));
    if (redis) {
      const raw = await redis.get(`ctx:session:${sessionId}`);
      if (raw) return JSON.parse(raw);
    }
  } catch { /* Redis 不可用 */ }

  // 内存降级
  const entry = sessionContextCache.get(sessionId);
  if (entry && Date.now() - entry.ts < contextCacheTTL) {
    return entry.data;
  }
  return null;
}

/** 缓存会话上下文摘要 */
export async function setSessionContext(sessionId, data) {
  if (!contextCacheEnabled || !sessionId) return;

  try {
    const { default: redis } = await import('../utils/redis.js').catch(() => ({ default: null }));
    if (redis) {
      await redis.setex(`ctx:session:${sessionId}`, Math.ceil(contextCacheTTL / 1000), JSON.stringify(data));
      return;
    }
  } catch { /* fallback */ }

  sessionContextCache.set(sessionId, { data, ts: Date.now() });
}

// 定期清理
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of sessionContextCache) {
    if (now - entry.ts > contextCacheTTL) sessionContextCache.delete(key);
  }
}, 60000).unref();

export {
  estimateTokens, getModelLimit, chunkText, slidingWindow, fallbackSummarize,
  calculateBudget, manageContextWindow, saveBudgetLog,
  BUDGET_RATIOS, MODEL_TOKEN_LIMITS,
};
