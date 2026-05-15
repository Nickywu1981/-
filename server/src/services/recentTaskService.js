/**
 * 中层记忆服务 — 近期任务记录与查询
 *
 * 三层记忆体系中的"中层"：
 *   表层：当前会话上下文（Claude Code 自动管理）
 *   中层：近期任务操作/结果/踩坑记录（本服务）
 *   深层：项目知识/决策/偏好（MEMORY.md + 各 memory/*.md）
 *
 * 记录结构：
 *   timestamp, operation, result, pitfalls[], filesChanged[], tags[]
 *
 * 存储位置: .claude/memory/recent/
 * 容量限制: 最近 50 条（自动滚动，旧记录归档到 archive/）
 */

import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

const RECENT_DIR = path.resolve('.claude/memory/recent');
const ARCHIVE_DIR = path.resolve('.claude/memory/recent/archive');
const MAX_RECORDS = 50;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** 格式化文件名 — YYYY-MM-DD_HHmmss_task-slug */
function buildFilename(timestamp, operation) {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  const slug = operation.replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-').slice(0, 60);
  return `${y}-${m}-${d}_${h}${mi}${s}_${slug}.md`;
}

/**
 * 记录一条任务
 * @param {{ operation: string, result: string, pitfalls?: string[], filesChanged?: string[], tags?: string[] }} task
 * @returns {{ id: string, file: string }}
 */
export function recordTask({ operation, result, pitfalls = [], filesChanged = [], tags = [] }) {
  ensureDir(RECENT_DIR);

  const timestamp = new Date().toISOString();
  const dateStr = timestamp.replace('T', ' ').replace(/\.\d{3}Z/, '');
  const filename = buildFilename(timestamp, operation);
  const filePath = path.join(RECENT_DIR, filename);

  const pitfallsMd = pitfalls.length > 0
    ? pitfalls.map(p => `- ${p}`).join('\n')
    : '- (none)';

  const filesMd = filesChanged.length > 0
    ? filesChanged.map(f => `- \`${f}\``).join('\n')
    : '- (not recorded)';

  const content = [
    '---',
    `operation: "${operation}"`,
    `timestamp: "${timestamp}"`,
    `tags: [${tags.map(t => `"${t}"`).join(', ')}]`,
    '---',
    '',
    `# ${operation}`,
    '',
    `**时间**: ${dateStr}`,
    '',
    '## 结果',
    result,
    '',
    '## 踩坑记录',
    pitfallsMd,
    '',
    '## 涉及文件',
    filesMd,
  ].join('\n');

  fs.writeFileSync(filePath, content, 'utf-8');

  // 维护上限：超过 MAX_RECORDS 条时归档最旧记录
  try {
    const files = fs.readdirSync(RECENT_DIR)
      .filter(f => f.endsWith('.md') && f !== 'INDEX.md')
      .sort();

    if (files.length > MAX_RECORDS) {
      ensureDir(ARCHIVE_DIR);
      const excess = files.slice(0, files.length - MAX_RECORDS);
      for (const f of excess) {
        fs.renameSync(
          path.join(RECENT_DIR, f),
          path.join(ARCHIVE_DIR, f)
        );
      }
      logger.info(`[recentTaskService] Archived ${excess.length} old records`);
    }

    // Rebuild INDEX.md
    rebuildIndex();
  } catch (err) {
    logger.warn('[recentTaskService] Index maintenance failed:', err.message);
  }

  return { id: filename.replace('.md', ''), file: filePath };
}

/** 重建 INDEX.md */
function rebuildIndex() {
  ensureDir(RECENT_DIR);

  const files = fs.readdirSync(RECENT_DIR)
    .filter(f => f.endsWith('.md') && f !== 'INDEX.md')
    .sort()
    .reverse(); // newest first

  const entries = files.map((f, i) => {
    const raw = fs.readFileSync(path.join(RECENT_DIR, f), 'utf-8');
    const opMatch = raw.match(/operation:\s*"(.+)"/);
    const tsMatch = raw.match(/timestamp:\s*"(.+)"/);
    const tagMatch = raw.match(/tags:\s*\[(.+)\]/);
    const operation = opMatch ? opMatch[1] : f;
    const tags = tagMatch ? tagMatch[1].replace(/"/g, '').replace(/\s/g, '') : '';
    const dateStr = tsMatch ? tsMatch[1].slice(0, 10) : f.slice(0, 10);
    return `${i + 1}. [${dateStr}] ${operation}(${tags ? ` — ${tags}` : ''}) → ${f}`;
  });

  fs.writeFileSync(
    path.join(RECENT_DIR, 'INDEX.md'),
    `# Recent Tasks Index\n\n${entries.join('\n')}\n\n> 最近 ${files.length}/${MAX_RECORDS} 条记录\n`,
    'utf-8'
  );
}

/**
 * 查询近期任务
 * @param {{ tag?: string, limit?: number, operation?: string }} filter
 * @returns {Array<{operation: string, timestamp: string, files: string[]}>}
 */
export function queryRecentTasks({ tag, limit = 10, operation } = {}) {
  ensureDir(RECENT_DIR);

  const files = fs.readdirSync(RECENT_DIR)
    .filter(f => f.endsWith('.md') && f !== 'INDEX.md')
    .sort()
    .reverse();

  const results = [];
  for (const f of files) {
    if (results.length >= limit) break;

    const raw = fs.readFileSync(path.join(RECENT_DIR, f), 'utf-8');
    const opMatch = raw.match(/operation:\s*"(.+)"/);
    const tsMatch = raw.match(/timestamp:\s*"(.+)"/);
    const tagMatch = raw.match(/tags:\s*\[(.+)\]/);
    const fileMatch = raw.match(/涉及文件\n([\s\S]*?)(?=\n##|$)/);

    const op = opMatch ? opMatch[1] : '';
    const taskTags = tagMatch ? tagMatch[1].split(',').map(t => t.replace(/"/g, '').trim()) : [];
    const files = fileMatch ? [...fileMatch[1].matchAll(/`([^`]+)`/g)].map(m => m[1]) : [];

    if (tag && !taskTags.includes(tag)) continue;
    if (operation && !op.includes(operation)) continue;

    results.push({
      operation: op,
      timestamp: tsMatch ? tsMatch[1] : '',
      tags: taskTags,
      files,
    });
  }

  return results;
}

export default { recordTask, queryRecentTasks };
