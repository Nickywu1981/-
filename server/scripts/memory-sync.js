/**
 * memory-sync.js — 100% 永久记忆自动同步引擎
 *
 * 核心原理: 代码是唯一可信源头，记忆必须从代码+Git自动推导
 *
 * 四步闭环:
 *   1. SCAN   — 扫描项目全貌，获取 ground truth
 *   2. COMPARE — 对比 memory 文件中的声明 vs 实际
 *   3. UPDATE  — 自动回写 AUTO-START/AUTO-END 区域
 *   4. REPORT  — 输出准确率 + 差异清单
 *
 * 触发: PostToolUse Hook (Edit|Write) / SessionStart / Stop
 * 输出: stdout JSON → Hook 消费 | 更新 memory 文件 + KB_SNAPSHOT.md
 */
import { writeFileSync, readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { resolve, join, dirname, relative } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const memoryDir = resolve(process.env.HOME || process.env.USERPROFILE,
  '.claude/projects/I---------/memory');

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: root, encoding: 'utf8', timeout: 15000, ...opts }).trim();
  } catch { return ''; }
}

// ============================================================
// 1. SCAN — Ground Truth 采集
// ============================================================

function scanRecursive(dirPath, ext, skipDirs = []) {
  if (!existsSync(dirPath)) return [];
  const results = [];
  function walk(dir) {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory() && !skipDirs.includes(entry.name)) walk(full);
        else if (entry.isFile() && full.endsWith(ext)) results.push(full);
      }
    } catch {}
  }
  walk(dirPath);
  return results;
}

function countFiles(dirPath, ext) {
  if (!existsSync(dirPath)) return 0;
  let count = 0;
  function walk(dir) {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) walk(join(dir, entry.name));
        else if (entry.isFile() && entry.name.endsWith(ext)) count++;
      }
    } catch {}
  }
  walk(dirPath);
  return count;
}

function grepCount(filePath, pattern) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const regex = new RegExp(pattern, 'g');
    return (content.match(regex) || []).length;
  } catch { return 0; }
}

// --- 采集 ground truth ---
const gt = {
  scannedAt: new Date().toISOString(),
  pages: scanRecursive(resolve(root, 'client/pages'), '.vue', ['components', 'composables']).length,
  layouts: countFiles(resolve(root, 'client/layouts'), '.vue'),
  composables: countFiles(resolve(root, 'client/composables'), '.ts') + countFiles(resolve(root, 'client/composables'), '.js'),
  components: countFiles(resolve(root, 'client/components'), '.vue'),
  routes: countFiles(resolve(root, 'server/src/route'), '.js'),
  controllers: countFiles(resolve(root, 'server/src/controller'), '.js'),
  services: countFiles(resolve(root, 'server/src/services'), '.js'),
  daos: countFiles(resolve(root, 'server/src/dao'), '.js'),
  middleware: countFiles(resolve(root, 'server/src/middleware'), '.js'),
  sqlTables: grepCount(resolve(root, 'server/sql/schema.sql'), 'CREATE TABLE'),
  testFiles: countFiles(resolve(root, 'server/src/__tests__'), '.js'),
  zodCovered: (() => {
    const dir = resolve(root, 'server/src/route');
    if (!existsSync(dir)) return 0;
    let c = 0, t = 0;
    for (const f of readdirSync(dir).filter(f => f.endsWith('.js'))) {
      try {
        const content = readFileSync(join(dir, f), 'utf8');
        if (/z\.(object|string|number|enum|array|boolean)/.test(content)) c++;
        t++;
      } catch {}
    }
    return { covered: c, total: t };
  })(),
  adapters: countFiles(resolve(root, 'server/src/services/adapters'), '.js'),
  models: (() => {
    try {
      const models = JSON.parse(sh('node -e "const m=require(\'./server/src/services/modelDispatcher.js\');console.log(JSON.stringify(Object.keys(m.listModels?m.listModels():{})))"'));
      return models || [];
    } catch { return []; }
  })(),
  dockerCompose: existsSync(resolve(root, 'docker-compose.yml')),
  nginx: existsSync(resolve(root, 'nginx.conf')),
  pm2: existsSync(resolve(root, 'server/ecosystem.config.js')) || existsSync(resolve(root, 'server/ecosystem.config.cjs')),
  git: {
    branch: sh('git rev-parse --abbrev-ref HEAD'),
    lastCommit: sh('git log -1 --format="%h %s"'),
    totalCommits: parseInt(sh('git rev-list --count HEAD')) || 0,
    modifiedFiles: parseInt(sh('git status --porcelain | wc -l')) || 0,
  },
};

// 补充: Adapters 从 aiEngine 推导
try {
  const aePath = resolve(root, 'server/src/services/aiEngine.js');
  if (existsSync(aePath)) {
    const ae = readFileSync(aePath, 'utf8');
    const matches = ae.match(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]\.\/adapters\/(\w+)/g);
    gt.adapters = matches ? matches.length : countFiles(resolve(root, 'server/src/services/adapters'), '.js');
  }
} catch {}

// ============================================================
// 2. COMPARE — 对比 Memory 声明 vs Ground Truth
// ============================================================

// 需要检查的 memory 文件及其声明字段
const memoryClaims = {};

function readMemoryFile(filename) {
  const filepath = join(memoryDir, filename);
  if (!existsSync(filepath)) return null;
  return readFileSync(filepath, 'utf8');
}

function extractClaim(content, fieldName) {
  // 尝试从 AUTO-START/AUTO-END 区域提取
  const autoPattern = new RegExp(`<!--\\s*AUTO-START:${fieldName}\\s*-->([\\s\\S]*?)<!--\\s*AUTO-END:${fieldName}\\s*-->`, 'i');
  const auto = content.match(autoPattern);
  if (auto) return auto[1].trim();

  // 尝试从数值声明提取: "N 个页面" "N pages" "N文件" 等
  const manualPatterns = [
    new RegExp(`${fieldName}[：:]\\s*(\\d+)`, 'i'),
    new RegExp(`(\\d+)\\s*(个|项|条)?\\s*${fieldName}`, 'i'),
    new RegExp(`${fieldName}[\\s:：]+(\\d+)`, 'i'),
  ];
  for (const p of manualPatterns) {
    const m = content.match(p);
    if (m) return m[1];
  }
  return null;
}

// 加载所有 memory 文件
let discrepancyCount = 0;
let totalClaims = 0;
const discrepancies = [];

function checkClaim(file, field, claimed, actual) {
  totalClaims++;
  // 从格式化字符串中提取数值: "137 个页面" → "137", "✅ 已配置" → "✅"
  const claimedNum = String(claimed).match(/^\d+/)?.[0] || String(claimed);
  const actualStr = typeof actual === 'boolean' ? (actual ? '✅' : '❌') : String(actual);
  // 布尔字段: 只要有 ✅ 就算对
  if (actualStr === '✅' && String(claimed).startsWith('✅')) return;
  // 数字字段: 提取数字比较
  if (String(claimedNum) === String(actual)) return;

  discrepancyCount++;
  discrepancies.push({ file, field, claimed: String(claimed), actual: String(actual) });
}

// 读取 project_pending_tasks.md
const tasksContent = readMemoryFile('project_pending_tasks.md');
if (tasksContent) {
  checkClaim('project_pending_tasks.md', 'pages', extractClaim(tasksContent, 'pages') || '50+', gt.pages);
  checkClaim('project_pending_tasks.md', 'composables', extractClaim(tasksContent, 'composables') || '22', gt.composables);
  checkClaim('project_pending_tasks.md', 'testFiles', extractClaim(tasksContent, 'testFiles') || '22', gt.testFiles);
  checkClaim('project_pending_tasks.md', 'sqlTables', extractClaim(tasksContent, 'sqlTables') || '19', gt.sqlTables);
}

// ============================================================
// 3. UPDATE — 自动回写 AUTO 区域
// ============================================================

const autoFields = {
  // 每个字段: [文件名, 值生成函数]
  'project_pending_tasks.md': {
    pages: `${gt.pages} 个页面`,
    routes: `${gt.routes} 个路由`,
    controllers: `${gt.controllers} 个控制器`,
    services: `${gt.services} 个服务`,
    daos: `${gt.daos} 个 DAO`,
    sqlTables: `${gt.sqlTables} 张表`,
    zodCoverage: `${gt.zodCovered.covered}/${gt.zodCovered.total} 路由 Zod 覆盖`,
    composables: `${gt.composables} 个 composables`,
    components: `${gt.components} 个通用组件`,
    adapters: `${gt.adapters} 个 AI 适配器`,
    testFiles: `${gt.testFiles} 个测试文件`,
    dockerCompose: gt.dockerCompose ? '✅ 已配置' : '❌ 缺失',
    nginx: gt.nginx ? '✅ 已配置' : '❌ 缺失',
    pm2: gt.pm2 ? '✅ 已配置' : '❌ 缺失',
    gitBranch: gt.git.branch,
    gitLastCommit: gt.git.lastCommit,
    gitTotalCommits: `${gt.git.totalCommits} 次提交`,
    scannedAt: gt.scannedAt.replace('T', ' ').slice(0, 19),
  },
};

function syncMemoryFile(filename) {
  const filepath = join(memoryDir, filename);
  if (!existsSync(filepath)) {
    console.error(`[memory-sync] ⚠️  ${filename} 不存在，跳过`);
    return false;
  }
  if (!autoFields[filename]) return false;

  let content = readFileSync(filepath, 'utf8');
  let updated = false;

  for (const [field, value] of Object.entries(autoFields[filename])) {
    const autoPattern = new RegExp(
      `<!--\\s*AUTO-START:${field}\\s*-->[\\s\\S]*?<!--\\s*AUTO-END:${field}\\s*-->`,
      'i'
    );

    const replacement = `<!-- AUTO-START:${field} -->\n${value}\n<!-- AUTO-END:${field} -->`;

    if (autoPattern.test(content)) {
      // 更新已有区域
      content = content.replace(autoPattern, replacement);
      updated = true;
    } else {
      // 首次注入: 在文件末尾 "---" 分隔线之前添加
      if (content.includes('---')) {
        const lastDash = content.lastIndexOf('---');
        if (lastDash > content.length - 100) {
          // --- 在末尾附近，在它之前插入
          content = content.slice(0, lastDash).trimEnd() +
            `\n\n<!-- ⬇️ 以下由 memory-sync.js 自动维护，禁止手动编辑 ⬇️ -->\n\n${replacement}\n\n---`;
          updated = true;
        }
      }
    }
  }

  if (updated) {
    writeFileSync(filepath, content, 'utf8');
    console.error(`[memory-sync] ✅ ${filename} 已自动更新`);
  }

  return updated;
}

// 执行同步
let syncCount = 0;
for (const filename of Object.keys(autoFields)) {
  if (syncMemoryFile(filename)) syncCount++;
}

// ============================================================
// 4. REPORT — 输出准确率报告
// ============================================================

const accuracy = totalClaims > 0
  ? Math.round(((totalClaims - discrepancyCount) / totalClaims) * 100)
  : 100;

const report = {
  success: discrepancyCount === 0,
  accuracy,
  totalClaims,
  discrepancyCount,
  syncCount,
  groundTruth: {
    pages: gt.pages,
    routes: gt.routes,
    controllers: gt.controllers,
    services: gt.services,
    daos: gt.daos,
    sqlTables: gt.sqlTables,
    zodCoverage: gt.zodCovered,
    composables: gt.composables,
    components: gt.components,
    adapters: gt.adapters,
    testFiles: gt.testFiles,
    dockerCompose: gt.dockerCompose,
    nginx: gt.nginx,
    pm2: gt.pm2,
    git: gt.git,
  },
  discrepancies,
  memoryDir,
  scannedAt: gt.scannedAt,
};

// stdout JSON 给 Hook 消费
const stdoutJson = JSON.stringify({
  systemMessage: `记忆同步完成: 准确率${accuracy}% ${discrepancyCount>0?`(${discrepancyCount}处差异已自动修复)`:'(已完美同步)'}`,
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    additionalContext: `Memory Sync: ${accuracy}% accuracy, ${syncCount} files synced, ${discrepancyCount} discrepancies auto-fixed. Ground truth: ${gt.pages}p/${gt.routes}r/${gt.controllers}c/${gt.services}s/${gt.daos}d`,
  },
  detail: report,
});

process.stdout.write(stdoutJson);

// 退出码: 0=完美, 1=有差异但已修复, 2=扫描失败
process.exitCode = discrepancyCount > 0 ? 1 : 0;
