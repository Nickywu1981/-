/**
 * KB Snapshot — 自动扫描项目全貌 → KB_SNAPSHOT.md
 * 由 PostToolUse Hook 触发，零人工介入
 * 扫描: 页面/路由/控制器/服务/DAO/中间件/数据表/测试/依赖/配置
 */
import { writeFileSync, readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

function sh(cmd, cwd = root) {
  try { return execSync(cmd, { cwd, encoding: 'utf8', timeout: 15000 }).trim(); } catch { return ''; }
}

// ============ 扫描函数 ============

function scanDir(dirPath) {
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath).filter(f => f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.vue'));
}

function scanRecursive(dirPath, ext = '.vue') {
  if (!existsSync(dirPath)) return [];
  const results = [];
  function walk(dir) {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'components' && entry.name !== 'composables') walk(full);
        else if (entry.isFile() && full.endsWith(ext)) results.push(full);
      }
    } catch {}
  }
  walk(dirPath);
  return results;
}

function countLines(filePath) {
  try { return sh(`wc -l < "${filePath}"`); } catch { return '?'; }
}

// ============ 数据收集 ============

const snapshot = {
  generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  project: 'Movio AI 电商智能助手 SaaS',

  pages: {},
  routes: [],
  controllers: [],
  services: [],
  daos: [],
  middleware: [],
  sqlTables: [],
  tests: {
    server: { files: 0, passed: 0, total: 0 },
    client: { files: 0 },
  },
  dependencies: { server: {}, client: {} },
  config: {},
};

// --- 前端页面 ---
const clientPages = resolve(root, 'client/pages');
const allPages = scanRecursive(clientPages);
snapshot.pages.total = allPages.length;

const categories = ['work', 'admin', 'my', 'login', 'index', 'workspace', 'register', 'forgot-password'];
categories.forEach(cat => {
  const catDir = join(clientPages, cat);
  if (existsSync(catDir)) {
    const files = scanRecursive(catDir);
    if (files.length > 0) snapshot.pages[cat] = files.length;
  }
});

// 单文件页面 (无子目录)
const singleFiles = scanDir(clientPages).filter(f => f.endsWith('.vue'));
if (singleFiles.length > 0) snapshot.pages['root'] = singleFiles.length;

// --- 后端路由 ---
const routeDir = resolve(root, 'server/src/route');
snapshot.routes = scanDir(routeDir).map(f => {
  const name = f.replace('.js', '');
  const lines = countLines(join(routeDir, f));
  return { file: name, lines };
});

// --- 控制器 ---
const ctrlDir = resolve(root, 'server/src/controller');
snapshot.controllers = scanDir(ctrlDir).map(f => ({
  name: f.replace('.js', ''),
  lines: countLines(join(ctrlDir, f))
}));

// --- 服务 ---
const svcDir = resolve(root, 'server/src/services');
snapshot.services = scanDir(svcDir).map(f => ({
  name: f.replace('.js', ''),
  lines: countLines(join(svcDir, f))
}));

// --- DAO ---
const daoDir = resolve(root, 'server/src/dao');
snapshot.daos = scanDir(daoDir).map(f => ({
  name: f.replace('.js', ''),
  lines: countLines(join(daoDir, f))
}));

// --- 中间件 ---
const mwDir = resolve(root, 'server/src/middleware');
snapshot.middleware = scanDir(mwDir).map(f => ({
  name: f.replace('.js', ''),
  lines: countLines(join(mwDir, f))
}));

// --- SQL 表 ---
const schemaFile = resolve(root, 'server/sql/schema.sql');
if (existsSync(schemaFile)) {
  const tables = sh(`grep -c "CREATE TABLE" "${schemaFile}"`);
  snapshot.sqlTables = parseInt(tables) || 0;
}

// --- 测试 ---
const testDir = resolve(root, 'server/src/__tests__');
const testFiles = scanRecursive(testDir, '.js');
snapshot.tests.server.files = testFiles.length;
const testOut = sh('npx vitest run --reporter=json 2>/dev/null', resolve(root, 'server'));
try {
  const json = JSON.parse(testOut);
  snapshot.tests.server.passed = json.testResults?.reduce((sum, r) => sum + (r.assertionResults?.filter(a => a.status === 'passed').length || 0), 0) || 0;
  snapshot.tests.server.total = json.numTotalTests || 0;
} catch {
  snapshot.tests.server.passed = '?';
  snapshot.tests.server.total = '?';
}

const clientTestDir = resolve(root, 'client');
const clientTests = sh(`find "${clientTestDir}" -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | wc -l`);
snapshot.tests.client.files = parseInt(clientTests) || 0;

// --- Zod 覆盖 (Node.js 读文件，避免 Windows bash grep 兼容问题) ---
let zodCovered = 0;
let asyncCovered = 0;
for (const f of snapshot.routes) {
  try {
    const content = readFileSync(join(routeDir, f.file + '.js'), 'utf8');
    if (/z\.(object|string|number|enum|array|boolean)/.test(content)) zodCovered++;
    if (/asyncHandler/.test(content)) asyncCovered++;
  } catch {}
}
snapshot.zodCoverage = { covered: zodCovered, total: snapshot.routes.length };
snapshot.asyncHandlerCoverage = { covered: asyncCovered, total: snapshot.routes.length };

// --- 依赖 ---
const spkgPath = resolve(root, 'server/package.json');
const cpkgPath = resolve(root, 'client/package.json');
try {
  const raw = readFileSync(spkgPath, 'utf8');
  const spkg = JSON.parse(raw);
  snapshot.dependencies.server = {
    deps: Object.keys(spkg.dependencies || {}).length,
    devDeps: Object.keys(spkg.devDependencies || {}).length,
    key: Object.keys(spkg.dependencies || {}).filter(k =>
      ['express', 'mysql2', 'redis', 'jsonwebtoken', 'zod', 'minio', 'ws', 'bullmq'].includes(k)
    ),
  };
} catch {}
try {
  const raw = readFileSync(cpkgPath, 'utf8');
  const cpkg = JSON.parse(raw);
  snapshot.dependencies.client = {
    deps: Object.keys(cpkg.dependencies || {}).length,
    devDeps: Object.keys(cpkg.devDependencies || {}).length,
    key: Object.keys(cpkg.dependencies || {}).filter(k =>
      ['nuxt', 'vue', 'pinia', 'element-plus', 'chart.js'].includes(k)
    ),
  };
} catch {}

// --- 配置 ---
snapshot.config.dockerCompose = existsSync(resolve(root, 'docker-compose.yml'));
snapshot.config.nginx = existsSync(resolve(root, 'nginx.conf'));
snapshot.config.pm2 = existsSync(resolve(root, 'server/ecosystem.config.js'));
snapshot.config.settings = existsSync(resolve(root, '.claude/settings.local.json'));

// ============ 生成 KB_SNAPSHOT.md ============

function md(snapshot) {
  const p = snapshot.pages;
  const pageCategories = Object.entries(p).filter(([k]) => k !== 'total');
  const pagesSummary = pageCategories.map(([cat, count]) => `${cat}:${count}`).join(' ');

  return `# KB_SNAPSHOT — 自动快照

> **生成时间**: ${snapshot.generatedAt}
> **自动更新**: PostToolUse Hook 触发 | 零人工介入

---

## 前端页面: ${p.total} 个

| 分类 | 数量 |
|------|:--:|
${pageCategories.map(([cat, count]) => `| ${cat} | ${count} |`).join('\n')}

---

## 后端: ${snapshot.routes.length} 路由 · ${snapshot.controllers.length} 控制器 · ${snapshot.services.length} 服务 · ${snapshot.daos.length} DAO

### 路由 (${snapshot.routes.length} 条)
${snapshot.routes.map(r => `- \`${r.file}\` (${r.lines}行)`).join('\n')}

### 控制器 (${snapshot.controllers.length} 个)
${snapshot.controllers.map(c => `- \`${c.name}\` (${c.lines}行)`).join('\n')}

### 服务 (${snapshot.services.length} 个)
${snapshot.services.map(s => `- \`${s.name}\` (${s.lines}行)`).join('\n')}

### DAO (${snapshot.daos.length} 个)
${snapshot.daos.map(d => `- \`${d.name}\` (${d.lines}行)`).join('\n')}

### 中间件 (${snapshot.middleware.length} 个)
${snapshot.middleware.map(m => `- \`${m.name}\` (${m.lines}行)`).join('\n')}

---

## 覆盖率

| 维度 | 覆盖 |
|------|:--:|
| Zod 入参校验 | ${snapshot.zodCoverage.covered}/${snapshot.zodCoverage.total} |
| AsyncHandler | ${snapshot.asyncHandlerCoverage.covered}/${snapshot.asyncHandlerCoverage.total} |
| SQL 表 | ${snapshot.sqlTables} |
| 服务端测试 | ${snapshot.tests.server.files}文件 ${snapshot.tests.server.passed}/${snapshot.tests.server.total}通过 |
| 客户端测试 | ${snapshot.tests.client.files}文件 |

---

## 依赖与配置

| 检查项 | 状态 |
|------|:--:|
| Docker Compose | ${snapshot.config.dockerCompose ? '✅' : '❌'} |
| Nginx 配置 | ${snapshot.config.nginx ? '✅' : '❌'} |
| PM2 配置 | ${snapshot.config.pm2 ? '✅' : '❌'} |
| Settings Hook | ${snapshot.config.settings ? '✅' : '❌'} |
| 后端核心依赖 | ${snapshot.dependencies.server.key?.join(' ') || 'N/A'} |
| 前端核心依赖 | ${snapshot.dependencies.client.key?.join(' ') || 'N/A'} |

---

> 此文件由 \`server/scripts/kb-snapshot.js\` 自动生成
> 手动编辑会被下次扫描覆盖 | 改代码即自动更新
`;
}

// ============ 写入 ============

const outPath = resolve(root, 'docs/KB_SNAPSHOT.md');
writeFileSync(outPath, md(snapshot), 'utf8');

// 同时输出 JSON 供 Hook 消费
process.stdout.write(JSON.stringify({
  systemMessage: `KB_SNAPSHOT 已更新: ${snapshot.pages.total}页面 ${snapshot.routes.length}路由 ${snapshot.controllers.length}控制器`,
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    additionalContext: `KB 快照: ${snapshot.pages.total}页面 ${snapshot.routes.length}路由 ${snapshot.controllers.length}控制器 ${snapshot.services.length}服务 Zod${snapshot.zodCoverage.covered}/${snapshot.zodCoverage.total}`,
  },
}));
