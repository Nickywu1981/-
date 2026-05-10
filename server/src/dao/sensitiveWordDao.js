import pool from '../dao/db.js';

let wordCache = null;
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
  cacheTimestamp = 0;
}

export async function listSensitiveWords({ keyword, page = 1, pageSize = 50 }) {
  const cond = keyword ? 'WHERE word LIKE ?' : '';
  const params = keyword ? [`%${keyword}%`] : [];
  const offset = (page - 1) * pageSize;
  params.push(offset, pageSize);
  const [rows] = await pool.query(`SELECT * FROM sensitive_word ${cond} ORDER BY create_time DESC LIMIT ?, ?`, params);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM sensitive_word ${cond}`, params);
  return { list: rows, total };
}

export async function addSensitiveWord(word, category, level) {
  await pool.execute('INSERT IGNORE INTO sensitive_word (word, category, level) VALUES (?,?,?)', [word, category, level]);
}

export async function deleteSensitiveWord(id) {
  await pool.execute('DELETE FROM sensitive_word WHERE id = ?', [id]);
}

export async function checkText(text) {
  const words = await getActiveWords();
  const hits = [];
  for (const w of words) {
    try {
      if (new RegExp(w.word, 'i').test(text)) hits.push(w);
    } catch { if (text.includes(w.word)) hits.push(w); }
  }
  return { safe: hits.length === 0, hits, block: hits.some(h => h.level === 1), review: hits.some(h => h.level === 2) };
}
