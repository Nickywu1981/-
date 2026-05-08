/**
 * CLAUDE.md / MEMORY.md 自动审计脚本
 * 由 SessionStart / Stop hook 触发，对比规则文件数字与项目实际状态
 * 输出 JSON → hook 自动注入 additionalContext 提醒 AI 更新
 */
import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const claudePath = resolve(root, 'CLAUDE.md');

function sh(cmd, cwd = root) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', timeout: 10000 }).trim();
  } catch {
    return '';
  }
}

// 收集项目实际数字
// 页面数：排除 components/ composables/ 子目录的 .vue 文件
const pagesRaw = sh('bash -c "find client/pages -name \\"*.vue\\" -not -path \\"*/components/*\\" -not -path \\"*/composables/*\\" | wc -l"');
const routeFiles = sh('bash -c "ls server/src/route/*.js 2>/dev/null"');
const ctrlFiles = sh('bash -c "ls server/src/controller/*.js 2>/dev/null"');
const zodCount = sh('bash -c "grep -l \\"validate(\\" server/src/route/*.js 2>/dev/null | wc -l"');

const actual = {
  pages: parseInt(pagesRaw) || 0,
  routes: routeFiles ? routeFiles.split('\n').length : 0,
  controllers: ctrlFiles ? ctrlFiles.split('\n').length : 0,
  zodCoverage: parseInt(zodCount) || 0,
};

// 从 CLAUDE.md 提取声称的数字
let claudeContent = '';
try { claudeContent = readFileSync(claudePath, 'utf8'); } catch {}

const claimed = {
  pages: (claudeContent.match(/(\d+)\s*个.*页面/g) || []).map(s => parseInt(s))[0] || null,
  routes: (claudeContent.match(/(\d+)\s*条.*路由/g) || []).map(s => parseInt(s))[0] || null,
  controllers: (claudeContent.match(/(\d+)\s*个控制器/g) || []).map(s => parseInt(s))[0] || null,
  zodCoverage: parseInt((claudeContent.match(/Zod\s*(\d+)\/\d+/g) || [])[0]?.match(/\d+/)?.[0]) || null,
};

// 对比差异
const diffs = [];
for (const [key, val] of Object.entries(actual)) {
  if (val > 0 && claimed[key] !== null && claimed[key] !== val) {
    diffs.push(`${key}: ${claimed[key]}→${val}`);
  }
}

// 写审计日志
const logDir = resolve(root, '.claude');
try { mkdirSync(logDir, { recursive: true }); } catch {}
appendFileSync(resolve(logDir, 'audit-log.txt'),
  `${new Date().toISOString()} | diffs=${diffs.length} | ${diffs.join('; ') || 'OK'}\n`);

if (diffs.length > 0) {
  const msg = `CLAUDE.md 数据过期: ${diffs.join(', ')}`;
  process.stdout.write(JSON.stringify({
    systemMessage: msg,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: `⚠️ CLAUDE.md 数据过期需更新: ${diffs.join('; ')}。请用 Edit 工具更新 CLAUDE.md 中对应的数字。`,
    },
  }));
}
