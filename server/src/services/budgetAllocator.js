/**
 * P2 智能动态 Token 预算分配器 v1.0
 * G1 Architect | 按意图复杂度动态分配 max_tokens，替代固定 2000
 *
 * 决策层级:
 *   L0 — 关键词快速命中 (< 1ms, 命中率 70%+)
 *   L1 — 输入长度启发式打分 (< 5ms, 100% 覆盖)
 *
 * 4 档 Token Band:
 *   B0_BRIEF    512   — 问候/简单问答/翻译/分类
 *   B1_STANDARD 2048  — 文案/标题/卖点
 *   B2_GENEROUS 6144  — 详情页/脚本/分镜表
 *   B3_DEEP     12288 — 策略分析/合规审计/超长输入
 *
 * 动态因子 (3个):
 *   1. L0+L1 基础分
 *   2. 多轮对话自动 +1 Band (sessionMessageCount >= 3)
 *   3. 小时预算 ≤ 20% 时 -1 Band
 */
import logger from '../utils/logger.js';
import { INTENT_TYPES } from './intentClassifier.js';

// ==================== Intent -> Base Band 映射 ====================

const INTENT_BAND_MAP = {
  // B0 — 简单快速
  chat: 0, translate: 0, voice: 0, analyse_image: 0,

  // B1 — 标准文案
  copywriting: 1, selling_points: 1, poster: 1, main_image: 1,

  // B2 — 复杂生成
  scene_image: 2, detail_image: 2, product_detail: 2, infographic: 2,
  script: 2, main_video: 2, ad_video: 2, action_migrate: 2, video_clone: 2,

  // B3 — 深分析
  compliance: 3,
};

const CATEGORY_FALLBACK_BAND = {
  chat: 0, text: 1, image: 2, detail: 2, video: 2,
};

const BAND_TOKENS = [512, 2048, 6144, 12288];

const MIN_TOKENS = 256;
const MAX_TOKENS = 16384;

// L1 启发式：输入长度 → 复杂度加分
const L1_LENGTH_THRESHOLDS = [
  { chars: 150, bonus: 0 },
  { chars: 500, bonus: 1 },
  { chars: 1500, bonus: 2 },
];

// ==================== L0 关键词快速匹配（仅从 intentClassifier 的 KEYWORD_MAP 推断） ====================

const KEYWORD_BAND_HINTS = [
  { kw: ['策略','分析报告','竞品','规划','方案','战略','诊断','评估','深度'], band: 3 },
  { kw: ['详情页','长图','分镜','脚本','视频脚本','信息图','对比图','动作迁移'], band: 2 },
  { kw: ['翻译','怎么','如何','什么是','能不能','帮我看看','帮助'], band: 0 },
];

let _kwBandIndex = null;
function _buildKwBandIndex() {
  if (_kwBandIndex) return _kwBandIndex;
  _kwBandIndex = [];
  for (const entry of KEYWORD_BAND_HINTS) {
    for (const kw of entry.kw) {
      _kwBandIndex.push({ kw, band: entry.band });
    }
  }
  _kwBandIndex.sort((a, b) => b.kw.length - a.kw.length); // longest match first
  return _kwBandIndex;
}

// ==================== 主入口 ====================

/**
 * @param {object} params
 * @param {string} params.taskType — 任务类型 (text_gen / image_gen / ...)
 * @param {string} params.userInput — 用户原始输入
 * @param {string} [params.intentId] — 已分类的 intent ID（来自上游管线）
 * @param {string} [params.category] — 已分类的 category
 * @param {number} [params.sessionMessageCount] — 当前会话消息数
 * @param {number} [params.hourlyBudgetUsedPct] — 小时预算已用百分比 (0-100)
 * @returns {{ maxTokens: number, band: number, bandName: string, factors: object }}
 */
export function allocateBudget(params = {}) {
  const {
    taskType = 'text_gen',
    userInput = '',
    intentId,
    category,
    sessionMessageCount = 0,
    hourlyBudgetUsedPct = 0,
  } = params;

  // 非文本类任务不使用 Token 预算（图片/视频/音频模型不消耗文本 token）
  if (!taskType.startsWith('text') && taskType !== 'compliance_check' && taskType !== 'translate') {
    return { maxTokens: 0, band: -1, bandName: 'NON_TEXT', factors: { reason: 'non-text task, skip budget' } };
  }

  // ── Step 1: 确定基础 Band ──
  let band = _resolveBaseBand(userInput, intentId, category);

  // ── Step 2: L1 输入长度启发式 ──
  const inputLen = typeof userInput === 'string' ? userInput.length : 0;
  let l1Bonus = 0;
  for (let i = L1_LENGTH_THRESHOLDS.length - 1; i >= 0; i--) {
    if (inputLen >= L1_LENGTH_THRESHOLDS[i].chars) {
      l1Bonus = L1_LENGTH_THRESHOLDS[i].bonus;
      break;
    }
  }
  band += l1Bonus;

  // ── Step 3: 多轮对话自动 +1 ──
  const multiTurnBonus = sessionMessageCount >= 3 ? 1 : 0;
  band += multiTurnBonus;

  // ── Step 4: 小时预算紧张 -1 ──
  const budgetPenalty = hourlyBudgetUsedPct >= 80 ? -1 : 0;
  band += budgetPenalty;

  // 钳位到 [0, 3]
  band = Math.max(0, Math.min(3, band));
  const maxTokens = BAND_TOKENS[band];

  const bandNames = ['B0_BRIEF', 'B1_STANDARD', 'B2_GENEROUS', 'B3_DEEP'];

  logger.debug('[BudgetAllocator]', {
    intent: intentId || 'unknown',
    category: category || 'unknown',
    inputLen,
    baseBand: band - l1Bonus - multiTurnBonus - budgetPenalty,
    l1Bonus,
    multiTurnBonus,
    budgetPenalty,
    finalBand: band,
    maxTokens,
  });

  return {
    maxTokens,
    band,
    bandName: bandNames[band],
    factors: {
      baseBand: band - l1Bonus - multiTurnBonus - budgetPenalty,
      l1Bonus,
      multiTurnBonus,
      budgetPenalty,
      inputLen,
    },
  };
}

/**
 * 截断后升档 — finish_reason=length 时自动提升 Band 重试
 * @param {{ band: number }} current — 当前分配的 band 信息
 * @returns {{ maxTokens: number, band: number, bandName: string } | null} — null 表示已在最高档
 */
export function upgradeBand(current) {
  if (current.band >= 3) return null; // 已是 B3，无法再升
  const newBand = Math.min(current.band + 1, 3);
  return {
    maxTokens: BAND_TOKENS[newBand],
    band: newBand,
    bandName: ['B1_STANDARD', 'B2_GENEROUS', 'B3_DEEP'][newBand - 1],
  };
}

// ==================== 内部 ====================

function _resolveBaseBand(userInput, intentId, category) {
  // 优先用上游已分类的 intent
  if (intentId && INTENT_BAND_MAP[intentId] !== undefined) {
    return INTENT_BAND_MAP[intentId];
  }

  // L0 关键词直接命中的 Band 提示
  const idx = _buildKwBandIndex();
  const input = (userInput || '').toLowerCase();
  for (const { kw, band } of idx) {
    if (input.includes(kw)) return band;
  }

  // Category 兜底
  if (category && CATEGORY_FALLBACK_BAND[category] !== undefined) {
    return CATEGORY_FALLBACK_BAND[category];
  }

  // 纯文本长度启发式
  if (input.length > 1000) return 2;
  if (input.length > 300) return 1;
  return 1; // 默认标准档
}

// ==================== 小时预算查询辅助 ====================

let _hourlyBudgetQueryFn = null;

export function registerHourlyBudgetQuery(fn) {
  _hourlyBudgetQueryFn = fn;
}

export async function getHourlyBudgetUsedPct(tenantId) {
  if (!_hourlyBudgetQueryFn) return 0;
  try {
    return await _hourlyBudgetQueryFn(tenantId);
  } catch {
    return 0;
  }
}

export { BAND_TOKENS, MIN_TOKENS, MAX_TOKENS, INTENT_BAND_MAP };
export default { allocateBudget, upgradeBand, registerHourlyBudgetQuery, getHourlyBudgetUsedPct, BAND_TOKENS };
