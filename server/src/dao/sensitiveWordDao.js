import pool from './db.js';
import { parsePagination } from '../utils/pagination.js';
import { als } from './context.js';
import logger from '../utils/logger.js';

function _db() { return als.getStore()?.db || pool; }

let wordCache = null;
let regexCache = null;  // 缓存的 { word, regex, category, level } 数组
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟缓存

async function getActiveWords() {
  const now = Date.now();
  if (wordCache && (now - cacheTimestamp) < CACHE_TTL_MS) return wordCache;
  const [words] = await pool.execute('SELECT word, category, level FROM sensitive_word WHERE status = 1 LIMIT 5000');
  wordCache = words;
  cacheTimestamp = now;
  return words;
}

export function invalidateWordCache() {
  wordCache = null;
  regexCache = null;
  cacheTimestamp = 0;
}

export async function listSensitiveWords({ keyword, page = 1, pageSize = 50 }) {
  const cond = keyword ? 'WHERE word LIKE ?' : '';
  const params = keyword ? [`%${keyword}%`] : [];
  const { offset } = parsePagination({ page, pageSize });
  params.push(offset, pageSize);
  const [rows] = await _db().query(`SELECT id, tenant_id, word, category, level, status, create_time FROM sensitive_word ${cond} ORDER BY create_time DESC LIMIT ?, ?`, params);
  const countParams = keyword ? [`%${keyword}%`] : [];
  const [[{ total }]] = await _db().query(`SELECT COUNT(*) AS total FROM sensitive_word ${cond}`, countParams);
  return { list: rows, total };
}

export async function addSensitiveWord(word, category, level) {
  const [r] = await _db().execute('INSERT IGNORE INTO sensitive_word (word, category, level) VALUES (?,?,?)', [word, category, level]);
  invalidateWordCache();
  return r.affectedRows;
}

export async function deleteSensitiveWord(id) {
  const [r] = await _db().execute('DELETE FROM sensitive_word WHERE id = ?', [id]);
  invalidateWordCache();
  return r.affectedRows;
}

export async function checkText(text) {
  const words = await getActiveWords();
  // 复用编译后的正则表达式（避免每次调用 O(n) 编译）
  if (!regexCache) {
    regexCache = words.map(w => {
      try {
        const escaped = w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return { ...w, regex: new RegExp(escaped, 'i') };
      } catch (e) { logger.warn('[SensitiveWord] 正则表达式编译失败，降级为字符串匹配', { word: w.word, error: e.message }); return { ...w, regex: null }; }
    });
  }
  const hits = [];
  for (const w of regexCache) {
    try {
      if (w.regex?.test(text)) hits.push(w);
      else if (!w.regex && text.includes(w.word)) hits.push(w);
    } catch (e) { logger.warn('[SensitiveWord] 正则匹配异常，降级为字符串匹配', { word: w.word, error: e.message }); if (text.includes(w.word)) hits.push(w); }
  }
  return { safe: hits.length === 0, hits, block: hits.some(h => h.level === 1), review: hits.some(h => h.level === 2) };
}
