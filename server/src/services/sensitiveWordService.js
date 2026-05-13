/**
 * 敏感词检测服务 — Aho-Corasick 自动机增强版
 *
 * 功能：
 * - AC 自动机高效多模式匹配（O(n+m) vs 旧版 O(n*k)）
 * - 5分钟 TTL 词库缓存
 * - hit 结果包含: word, category, level
 */
import * as sensitiveWordDao from '../dao/sensitiveWordDao.js';
import logger from '../utils/logger.js';

// ==================== AC 自动机实现 ====================

class AhoCorasick {
  constructor() {
    this.root = { children: {}, fail: null, outputs: [] };
  }

  addPattern(word, meta = {}) {
    let node = this.root;
    for (const ch of word.toLowerCase()) {
      if (!node.children[ch]) node.children[ch] = { children: {}, fail: null, outputs: [] };
      node = node.children[ch];
    }
    node.outputs.push({ word, ...meta });
  }

  buildFailure() {
    const queue = [];
    for (const child of Object.values(this.root.children)) {
      child.fail = this.root;
      queue.push(child);
    }
    while (queue.length > 0) {
      const current = queue.shift();
      for (const [ch, child] of Object.entries(current.children)) {
        queue.push(child);
        let failNode = current.fail;
        while (failNode && !failNode.children[ch]) failNode = failNode.fail;
        child.fail = failNode ? failNode.children[ch] : this.root;
        child.outputs.push(...child.fail.outputs);
      }
    }
  }

  search(text) {
    const hits = [];
    if (!text) return hits;

    const lower = text.toLowerCase();
    let node = this.root;

    for (let i = 0; i < lower.length; i++) {
      const ch = lower[i];
      while (node && !node.children[ch]) node = node.fail;
      if (!node) { node = this.root; continue; }
      node = node.children[ch];
      for (const out of node.outputs) {
        hits.push({ ...out, position: i - out.word.length + 1 });
      }
    }
    return hits;
  }
}

// ==================== 词库缓存 ====================

let acAutomaton = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getAutomaton() {
  const now = Date.now();
  if (acAutomaton && (now - cacheTimestamp) < CACHE_TTL_MS) return acAutomaton;

  try {
    const words = await sensitiveWordDao.listSensitiveWords({ page: 1, pageSize: 5000 });
    const ac = new AhoCorasick();
    for (const w of words.list || words || []) {
      ac.addPattern(w.word, { category: w.category, level: w.level });
    }
    ac.buildFailure();
    acAutomaton = ac;
    cacheTimestamp = now;
    logger.info(`[SensitiveWord] AC 自动机已构建: ${words.list?.length || 0} 条敏感词`);
  } catch (e) {
    logger.error(`[SensitiveWord] AC 自动机构建失败: ${e.message}`);
    if (!acAutomaton) acAutomaton = new AhoCorasick(); // 降级为空自动机
  }

  return acAutomaton;
}

export function invalidateWordCache() {
  acAutomaton = null;
  cacheTimestamp = 0;
  try { sensitiveWordDao.invalidateWordCache?.(); } catch { /* okay */ }
}

// ==================== CRUD ====================

export async function listSensitiveWords(options) {
  return sensitiveWordDao.listSensitiveWords(options || {});
}

export async function addSensitiveWord(word, category, level) {
  const result = await sensitiveWordDao.addSensitiveWord(word, category, level);
  invalidateWordCache();
  return result;
}

export async function deleteSensitiveWord(id) {
  const result = await sensitiveWordDao.deleteSensitiveWord(id);
  invalidateWordCache();
  return result;
}

/**
 * 检查文本中的敏感词
 * @param {string} text - 待检测文本
 * @returns {{ safe: boolean, hits: Array, block: boolean, review: boolean }}
 */
export async function checkText(text) {
  if (!text || typeof text !== 'string') return { safe: true, hits: [], block: false, review: false };

  const ac = await getAutomaton();
  const hits = ac.search(text.slice(0, 10000));

  // 去重（同一词多次出现只保留一次）
  const seen = new Set();
  const uniqueHits = hits.filter(h => {
    const key = h.word;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    safe: uniqueHits.length === 0,
    hits: uniqueHits,
    block: uniqueHits.some(h => h.level === 1),
    review: uniqueHits.some(h => h.level === 2),
  };
}
