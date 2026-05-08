/**
 * kb-token-index.js — 永久 Token 精确索引
 *
 * 扫描全项目 → 提取所有标识符 → 建立 Token→位置 的不可变映射
 *
 * 索引对象:
 *   函数名/类名, 路由路径, 表名, 字段名, 组件名, composable名,
 *   DAO方法, Service方法, 中间件名, 配置键, SQL迁移, 错误码
 *
 * 输出: docs/KB_TOKEN_INDEX.json — 永久可查，100% 精确
 * 用法: node server/scripts/kb-token-index.js
 *        node server/scripts/kb-token-index.js --query "imageController"
 */
import { writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { resolve, join, relative, dirname, basename } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

// ============================================================
// 扫描器
// ============================================================

function scanFiles(dir, ext, skipDirs = ['node_modules', '.nuxt', '.git', 'dist', '.output']) {
  if (!existsSync(dir)) return [];
  const results = [];
  function walk(d) {
    try {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        const full = join(d, entry.name);
        if (entry.isDirectory()) {
          if (!skipDirs.includes(entry.name)) walk(full);
        } else if (entry.isFile() && entry.name.endsWith(ext)) {
          results.push(full);
        }
      }
    } catch {}
  }
  walk(dir);
  return results;
}

function readFile(path) {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}

// ============================================================
// Token 提取器 — 按文件类型
// ============================================================

// 从 JS 提取导出函数: export async function foo / export const foo = / module.exports = { foo }
function extractJsExports(content, filePath) {
  const tokens = [];
  // export async function name / export function name
  for (const m of content.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) {
    tokens.push({ token: m[1], type: 'function', file: filePath, line: lineOf(content, m.index) });
  }
  // export const name = (async )?(req, res) / export const name = async (
  for (const m of content.matchAll(/export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(/g)) {
    tokens.push({ token: m[1], type: 'function', file: filePath, line: lineOf(content, m.index) });
  }
  // export const name = async function
  for (const m of content.matchAll(/export\s+const\s+(\w+)\s*=\s*async\s+function/g)) {
    tokens.push({ token: m[1], type: 'function', file: filePath, line: lineOf(content, m.index) });
  }
  // module.exports = { name1, name2 }
  const me = content.match(/module\.exports\s*=\s*\{([^}]+)\}/);
  if (me) {
    for (const name of me[1].matchAll(/(\w+)/g)) {
      tokens.push({ token: name[1], type: 'function', file: filePath, line: lineOf(content, me.index) });
    }
  }
  return tokens;
}

// 从路由文件提取路径: router.get('/api/xxx', handler)
function extractRoutes(content, filePath) {
  const tokens = [];
  for (const m of content.matchAll(/router\.(get|post|put|delete|patch|use)\s*\(\s*['"]([^'"]+)['"]/g)) {
    tokens.push({
      token: `${m[1].toUpperCase()} ${m[2]}`,
      type: 'route',
      file: filePath,
      line: lineOf(content, m.index),
    });
    // 同时注册纯路径 token
    tokens.push({
      token: m[2],
      type: 'route-path',
      file: filePath,
      line: lineOf(content, m.index),
    });
  }
  return tokens;
}

// 从 Vue SFC 提取组件信息
function extractVueComponent(content, filePath) {
  const tokens = [];
  // <script setup> / <script> 中 export default { name: 'xxx' }
  const nameMatch = content.match(/name\s*:\s*['"]([^'"]+)['"]/);
  if (nameMatch) {
    tokens.push({ token: nameMatch[1], type: 'component', file: filePath, line: 1 });
  }
  // 页面路径 (从文件路径推导)
  const rel = relative(resolve(root, 'client/pages'), filePath).replace(/\\/g, '/');
  const routePath = '/' + rel.replace(/\.vue$/, '').replace(/\/index$/, '');
  tokens.push({ token: routePath, type: 'page-route', file: filePath, line: 1 });
  if (routePath !== '/') {
    tokens.push({ token: routePath.replace(/^\//, ''), type: 'page-alias', file: filePath, line: 1 });
  }
  return tokens;
}

// 从 SQL schema 提取 CREATE TABLE 及字段
function extractSqlSchema(content, filePath) {
  const tokens = [];
  for (const m of content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/gi)) {
    const tableName = m[1];
    tokens.push({ token: tableName, type: 'sql-table', file: filePath, line: lineOf(content, m.index) });
  }
  // 提取列名
  for (const m of content.matchAll(/^\s*`(\w+)`\s+(VARCHAR|INT|TEXT|DECIMAL|DATETIME|TIMESTAMP|ENUM|JSON|BOOLEAN|TINYINT|BIGINT)/gm)) {
    tokens.push({ token: m[1], type: 'sql-column', file: filePath, line: lineOf(content, m.index) });
  }
  return tokens;
}

// 从 DAO 提取 SQL 表引用
function extractDaoTableRefs(content, filePath) {
  const tokens = [];
  // FROM `table_name` / JOIN `table_name` / INSERT INTO `table_name`
  for (const m of content.matchAll(/(?:FROM|JOIN|INSERT\s+INTO|UPDATE|INTO)\s+`?(\w+)`?/gi)) {
    const table = m[1].toLowerCase();
    if (!['dual', 'information_schema'].includes(table)) {
      tokens.push({ token: table, type: 'dao-table-ref', file: filePath, line: lineOf(content, m.index) });
    }
  }
  return tokens;
}

// 从 .env / config 提取配置键
function extractConfigKeys(content, filePath) {
  const tokens = [];
  for (const m of content.matchAll(/^([A-Z_][A-Z0-9_]+)\s*=\s*/gm)) {
    tokens.push({ token: m[1], type: 'config-key', file: filePath, line: lineOf(content, m.index) });
  }
  return tokens;
}

// composable 导出
function extractComposableExports(content, filePath) {
  const tokens = [];
  for (const m of content.matchAll(/export\s+(?:const|function)\s+(use\w+)/g)) {
    tokens.push({ token: m[1], type: 'composable', file: filePath, line: lineOf(content, m.index) });
  }
  return tokens;
}

// 错误码
function extractErrorCodes(content, filePath) {
  const tokens = [];
  for (const m of content.matchAll(/([A-Z_]{3,40})\s*:\s*\{\s*code\s*:\s*(\d+)/g)) {
    tokens.push({ token: m[1], type: 'error-code', file: filePath, line: lineOf(content, m.index) });
  }
  return tokens;
}

function lineOf(content, index) {
  return (content.slice(0, index).match(/\n/g) || []).length + 1;
}

// ============================================================
// 构建索引
// ============================================================

const index = {
  generatedAt: new Date().toISOString(),
  project: 'Movio AI',
  tokens: {},        // token → [{type, file, line}, ...]
  byType: {},        // type → [token, ...]
  stats: {},
};

function addTokens(tokens) {
  for (const { token, type, file, line } of tokens) {
    const relFile = relative(root, file).replace(/\\/g, '/');
    if (!index.tokens[token]) index.tokens[token] = [];
    // 避免重复
    if (!index.tokens[token].some(t => t.file === relFile && t.line === line)) {
      index.tokens[token].push({ type, file: relFile, line });
    }
    if (!index.byType[type]) index.byType[type] = new Set();
    index.byType[type].add(token);
  }
}

// --- 扫描后端 ---
const serverDir = resolve(root, 'server/src');

// 控制器
for (const f of scanFiles(resolve(serverDir, 'controller'), '.js')) {
  addTokens(extractJsExports(readFile(f), f));
}

// 服务
for (const f of scanFiles(resolve(serverDir, 'services'), '.js')) {
  addTokens(extractJsExports(readFile(f), f));
}

// DAO
for (const f of scanFiles(resolve(serverDir, 'dao'), '.js')) {
  const content = readFile(f);
  addTokens(extractJsExports(content, f));
  addTokens(extractDaoTableRefs(content, f));
}

// 路由
for (const f of scanFiles(resolve(serverDir, 'route'), '.js')) {
  addTokens(extractRoutes(readFile(f), f));
}

// 中间件
for (const f of scanFiles(resolve(serverDir, 'middleware'), '.js')) {
  addTokens(extractJsExports(readFile(f), f));
}

// 错误码
const ecFile = resolve(serverDir, 'constants/errorCode.js');
if (existsSync(ecFile)) {
  addTokens(extractErrorCodes(readFile(ecFile), ecFile));
}

// 配置
const envFile = resolve(root, 'server/.env');
if (existsSync(envFile)) {
  addTokens(extractConfigKeys(readFile(envFile), envFile));
}

// 适配器
for (const f of scanFiles(resolve(serverDir, 'services/adapters'), '.js')) {
  addTokens(extractJsExports(readFile(f), f));
}

// --- 扫描前端 ---
const clientDir = resolve(root, 'client');

// 页面
for (const f of scanFiles(resolve(clientDir, 'pages'), '.vue')) {
  addTokens(extractVueComponent(readFile(f), f));
}

// Composable
for (const f of scanFiles(resolve(clientDir, 'composables'), '.ts')) {
  addTokens(extractComposableExports(readFile(f), f));
}
for (const f of scanFiles(resolve(clientDir, 'composables'), '.js')) {
  addTokens(extractComposableExports(readFile(f), f));
}

// --- SQL Schema ---
const schemaFile = resolve(root, 'server/sql/schema.sql');
if (existsSync(schemaFile)) {
  addTokens(extractSqlSchema(readFile(schemaFile), schemaFile));
}

// --- CLAUDE.md 规则 ---
const claudeFile = resolve(root, 'CLAUDE.md');
if (existsSync(claudeFile)) {
  const claude = readFile(claudeFile);
  // 提取 ## 标题
  for (const m of claude.matchAll(/^##\s+(.+)$/gm)) {
    addTokens([{ token: m[1].trim(), type: 'claude-rule', file: 'CLAUDE.md', line: lineOf(claude, m.index) }]);
  }
}

// --- 统计 ---
index.stats = {
  totalTokens: Object.keys(index.tokens).length,
  byType: Object.fromEntries(
    Object.entries(index.byType).map(([k, v]) => [k, v.size])
  ),
};

// 将 Set 转为数组用于 JSON 序列化
index.byType = Object.fromEntries(
  Object.entries(index.byType).map(([k, v]) => [k, [...v].sort()])
);

// ============================================================
// 输出
// ============================================================

const outDir = resolve(root, 'docs');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'KB_TOKEN_INDEX.json');
writeFileSync(outPath, JSON.stringify(index, null, 2), 'utf8');

// ============================================================
// 查询模式
// ============================================================

const queryArg = process.argv.find(a => a.startsWith('--query='));
if (queryArg) {
  const query = queryArg.replace('--query=', '').trim();
  const results = index.tokens[query];
  if (results) {
    console.error(`\n🔍 "${query}" → ${results.length} 处匹配:\n`);
    for (const r of results) {
      console.error(`  [${r.type}] ${r.file}:${r.line}`);
    }
  } else {
    // 模糊搜索
    const fuzzy = Object.keys(index.tokens)
      .filter(k => k.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 20);
    if (fuzzy.length > 0) {
      console.error(`\n🔍 "${query}" → 精确匹配 0，模糊匹配 ${fuzzy.length} 个:\n`);
      for (const f of fuzzy) {
        const locs = index.tokens[f];
        console.error(`  ${f} → ${locs.map(l => `[${l.type}] ${l.file}:${l.line}`).join(', ')}`);
      }
    } else {
      console.error(`\n🔍 "${query}" → 未找到任何匹配\n`);
    }
  }
} else {
  // 标准输出 JSON
  const stdoutJson = JSON.stringify({
    systemMessage: `Token索引已构建: ${index.stats.totalTokens} 个唯一Token, ${Object.keys(index.stats.byType).length} 种类型`,
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `Token Index: ${index.stats.totalTokens} tokens - functions:${index.stats.byType.function?.length||0} routes:${index.stats.byType.route?.length||0} sql-tables:${index.stats.byType['sql-table']?.length||0} components:${index.stats.byType.component?.length||0}`,
    },
    stats: index.stats,
  });
  process.stdout.write(stdoutJson);
}
