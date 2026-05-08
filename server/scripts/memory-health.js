/**
 * memory-health.js — 记忆准确率自检
 *
 * 纯只读扫描，不修改任何文件。
 * 对比 memory 文件中的所有声明 vs 实际代码状态，输出准确率报告。
 *
 * 用法: node server/scripts/memory-health.js
 * 输出: JSON → stdout (accuracy, discrepancies, recommendations)
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const memoryDir = resolve(process.env.HOME || process.env.USERPROFILE,
  '.claude/projects/I---------/memory');

function sh(cmd) {
  try { return execSync(cmd, { cwd: root, encoding: 'utf8', timeout: 10000 }).trim(); }
  catch { return ''; }
}

// ========== Ground Truth ==========

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
    return (content.match(new RegExp(pattern, 'g')) || []).length;
  } catch { return 0; }
}

const gt = {
  scannedAt: new Date().toISOString(),
  pages: countFiles(resolve(root, 'client/pages'), '.vue'),
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
  dockerCompose: existsSync(resolve(root, 'docker-compose.yml')),
  nginx: existsSync(resolve(root, 'nginx.conf')),
  pm2: existsSync(resolve(root, 'server/ecosystem.config.js')) || existsSync(resolve(root, 'server/ecosystem.config.cjs')),
  adapters: countFiles(resolve(root, 'server/src/services/adapters'), '.js'),
  git: {
    branch: sh('git rev-parse --abbrev-ref HEAD'),
    lastCommit: sh('git log -1 --format="%h %s"'),
    totalCommits: parseInt(sh('git rev-list --count HEAD')) || 0,
  },
};

// Zod coverage
gt.zodCovered = (() => {
  const dir = resolve(root, 'server/src/route');
  if (!existsSync(dir)) return { covered: 0, total: 0 };
  let c = 0, t = 0;
  for (const f of readdirSync(dir).filter(f => f.endsWith('.js'))) {
    try {
      const content = readFileSync(join(dir, f), 'utf8');
      if (/z\.(object|string|number|enum|array|boolean)/.test(content)) c++;
      t++;
    } catch {}
  }
  return { covered: c, total: t };
})();

// ========== Memory 声明扫描 ==========

function readMemory(filename) {
  const fp = join(memoryDir, filename);
  return existsSync(fp) ? readFileSync(fp, 'utf8') : null;
}

// 从 AUTO-START/AUTO-END 区域或粗略声明中提取数值
function extractNumber(content, fieldName) {
  // 优先从 AUTO 区域读取
  const autoPattern = new RegExp(`<!--\\s*AUTO-START:${fieldName}\\s*-->\\s*(\\S[\\s\\S]*?)\\s*<!--\\s*AUTO-END:${fieldName}\\s*-->`, 'i');
  const auto = content?.match(autoPattern);
  if (auto) {
    const num = auto[1].match(/\d+/);
    return num ? num[0] : auto[1].trim();
  }
  return null;
}

// ========== 对比判定 ==========

const checks = [];
let passCount = 0;
let failCount = 0;

function check(category, field, actualValue, memoryFile, memoryValue) {
  // 智能比较: 布尔字段检查正向匹配, 数字字段提取数值比较
  const actualStr = typeof actualValue === 'boolean' ? (actualValue ? '✅' : '❌') : String(actualValue);
  const memStr = String(memoryValue || '');
  let passed;

  if (actualStr === '✅' && memStr.includes('✅')) {
    passed = true;  // 布尔正向: "✅" ≈ "✅ 已配置"
  } else {
    const memNum = memStr.match(/^\d+/)?.[0] || memStr;
    const actNum = actualStr.match(/^\d+/)?.[0] || actualStr;
    passed = memNum === actNum;
  }

  if (passed) passCount++; else failCount++;
  checks.push({
    category,
    field,
    actual: String(actualValue),
    memory: memoryValue || '(未记录)',
    passed,
    file: memoryFile,
  });
}

// 读取关键 memory 文件
const tasksContent = readMemory('project_pending_tasks.md');
const techContent = readMemory('project_tech_stack.md');

// 对比
check('前端', '页面数', gt.pages, 'project_pending_tasks.md', extractNumber(tasksContent, 'pages'));
check('前端', 'Composables', gt.composables, 'project_pending_tasks.md', extractNumber(tasksContent, 'composables'));
check('前端', '组件数', gt.components, 'project_pending_tasks.md', extractNumber(tasksContent, 'components'));

check('后端', '路由数', gt.routes, 'project_pending_tasks.md', extractNumber(tasksContent, 'routes'));
check('后端', '控制器数', gt.controllers, 'project_pending_tasks.md', extractNumber(tasksContent, 'controllers'));
check('后端', '服务数', gt.services, 'project_pending_tasks.md', extractNumber(tasksContent, 'services'));
check('后端', 'DAO数', gt.daos, 'project_pending_tasks.md', extractNumber(tasksContent, 'daos'));

check('数据库', 'SQL表数', gt.sqlTables, 'project_pending_tasks.md', extractNumber(tasksContent, 'sqlTables'));

check('测试', '测试文件', gt.testFiles, 'project_pending_tasks.md', extractNumber(tasksContent, 'testFiles'));

check('AI引擎', '适配器数', gt.adapters, 'project_pending_tasks.md', extractNumber(tasksContent, 'adapters'));

check('覆盖率', 'Zod覆盖', `${gt.zodCovered.covered}/${gt.zodCovered.total}`, 'project_pending_tasks.md',
  extractNumber(tasksContent, 'zodCoverage') ? `${extractNumber(tasksContent, 'zodCoverage')}` : null);

check('基础设施', 'Docker Compose', gt.dockerCompose ? '✅' : '❌', 'project_pending_tasks.md',
  extractNumber(tasksContent, 'dockerCompose'));
check('基础设施', 'Nginx配置', gt.nginx ? '✅' : '❌', 'project_pending_tasks.md',
  extractNumber(tasksContent, 'nginx'));
check('基础设施', 'PM2配置', gt.pm2 ? '✅' : '❌', 'project_pending_tasks.md',
  extractNumber(tasksContent, 'pm2'));

// ========== 计算健康分 ==========
const total = checks.length;
const accuracy = total > 0 ? Math.round((passCount / total) * 100) : 100;

// 健康等级
let grade;
if (accuracy === 100) grade = 'S — 完美同步，零偏差';
else if (accuracy >= 90) grade = 'A — 优秀，少量偏差';
else if (accuracy >= 70) grade = 'B — 良好，存在明显过时';
else if (accuracy >= 50) grade = 'C — 较差，多处不准确';
else grade = 'D — 严重，记忆基本失效';

const report = {
  accuracy,
  grade,
  passCount,
  failCount,
  total,
  scannedAt: gt.scannedAt,
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
  checks,
  failedChecks: checks.filter(c => !c.passed),
  recommendation: accuracy < 100
    ? `运行 node server/scripts/memory-sync.js 自动修复 ${failCount} 处偏差`
    : '无需操作，记忆状态完美',
};

process.stdout.write(JSON.stringify(report, null, 2));
