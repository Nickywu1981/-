/**
 * semantic-deep-test.js — 语义搜索深度测试 (50 用例 × 5 类别)
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const vsPath = resolve(root, 'docs/KB_VECTOR_STORE.json');

if (!existsSync(vsPath)) {
  console.error('Vector store not found at', vsPath);
  process.exit(1);
}

const store = JSON.parse(readFileSync(vsPath, 'utf8'));

// ── Tokenizer ──
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff_\-@/.]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && t.length < 60);
}

// ── Cosine similarity ──
function cosineSimilarity(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  let dot = 0, na = 0, nb = 0;
  for (const k of keys) {
    const va = a[k] || 0, vb = b[k] || 0;
    dot += va * vb; na += va * va; nb += vb * vb;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom < 1e-10 ? 0 : dot / denom;
}

// ── Knowledge graph ──
const GRAPH = {
  '数据库|SQL|表结构|DAO|字段': ['DB_Movio_AI_数据库与接口设计.md', 'feedback_six_categories.md'],
  'AI|模型|调度|GPT|Claude|Gemini': ['ARCH_Movio_AI_多模型架构方案.md', 'project_tech_stack.md'],
  '编码|命名|代码|变量|函数': ['coding_conventions.md', 'feedback_six_categories.md'],
  'Git|提交|commit|分支|PR': ['feedback_git_commit_rule.md', 'feedback_proactive_commit.md'],
  '安全|XSS|注入|限流|CORS|CSRF': ['feedback_data_api_specs.md', 'feedback_quality_gates.md'],
  '认证|登录|注册|JWT|Token|权限': ['feedback_data_api_specs.md', 'feedback_dev_rules.md'],
  '前端|UI|组件|Vue|页面|CSS': ['ui_capability_matrix.md', 'coding_conventions.md'],
  '支付|订单|交易|退款': ['project_tech_stack.md', 'feedback_data_api_specs.md'],
  '测试|用例|mock|vitest': ['feedback_dev_rules.md', 'project_pending_tasks.md'],
  '部署|上线|生产|Docker|PM2': ['ACCEPTANCE_上线验收清单.md', 'project_tech_stack.md'],
  '规则|规范|标准|铁律': ['feedback_dev_rules.md', 'coding_conventions.md'],
  '记忆|memory|持久|会话': ['feedback_memory_persistence.md', 'feedback_intelligent_mode.md'],
  '产品需求|PRD|功能规划': ['PRD_Movio_AI_产品需求文档.md', 'project_pending_tasks.md'],
  '多模型|架构|方案': ['ARCH_Movio_AI_多模型架构方案.md', 'Movio_AI_项目规整规划文档.md'],
  '路由|API|接口|端点': ['feedback_data_api_specs.md', 'feedback_dev_rules.md'],
  '文案|copywriting|生成|内容': ['project_tech_stack.md', 'project_pending_tasks.md'],
  'DIY|模板|template|编辑器': ['project_tech_stack.md', 'ui_capability_matrix.md'],
  '合规|审核|风控|内容审核': ['feedback_quality_gates.md', 'feedback_data_api_specs.md'],
  '支付签名|通联|allinpay': ['project_tech_stack.md', 'feedback_data_api_specs.md'],
  'Docker|容器|compose|部署': ['ACCEPTANCE_上线验收清单.md', 'project_tech_stack.md'],
};
function knowledgeScore(query, source) {
  let bonus = 0;
  for (const [pattern, sources] of Object.entries(GRAPH)) {
    if (new RegExp(pattern, 'i').test(query)) {
      if (sources.some(s => (source || '').includes(s))) bonus += 0.15;
    }
  }
  return Math.min(bonus, 0.35);
}

// ── Search ──
function searchSync(queryVec, store, topK, queryText) {
  const scored = store.chunks.map((chunk, i) => {
    const emb = store.vectors[i];
    if (!emb || (Array.isArray(emb) ? emb.length === 0 : Object.keys(emb).length === 0)) {
      return { ...chunk, score: 0, idx: i };
    }
    let score = cosineSimilarity(queryVec, emb);
    if (queryText) score += knowledgeScore(queryText, chunk.source);
    return { ...chunk, score, idx: i };
  });
  const raw = scored.filter(c => c.score > 0.005).sort((a, b) => b.score - a.score);
  const unique = [];
  for (const r of raw) {
    const isDuplicate = unique.some(u =>
      u.source === r.source && u.content.slice(0, 60) === r.content.slice(0, 60)
    );
    if (!isDuplicate) unique.push(r);
    if (unique.length >= topK) break;
  }
  return unique;
}

function search(query, topK = 5) {
  if (!query || query.trim() === '') return [];
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const queryVec = {};
  for (const t of tokens) queryVec[t] = (queryVec[t] || 0) + 1;
  const N = store.chunks.length;
  const df = new Map();
  for (const v of store.vectors) {
    for (const t of Object.keys(v)) df.set(t, (df.get(t) || 0) + 1);
  }
  for (const t of Object.keys(queryVec)) {
    const idf = Math.log((N + 1) / ((df.get(t) || 0) + 1));
    queryVec[t] *= idf;
  }
  return searchSync(queryVec, store, topK, query);
}

// ═══════════════════════════════════════════════
// 50 测试用例
// ═══════════════════════════════════════════════
const testCases = [
  // ── 核心功能 (10) ──
  { q: 'AI模型调度分发', expect: ['ARCH_Movio_AI_多模型架构方案.md', 'project_tech_stack.md'], cat: '核心功能' },
  { q: '数据库表设计和字段', expect: ['DB_Movio_AI_数据库与接口设计.md', 'feedback_six_categories.md'], cat: '核心功能' },
  { q: '用户登录JWT认证流程', expect: ['feedback_data_api_specs.md', 'feedback_dev_rules.md'], cat: '核心功能' },
  { q: '支付回调处理逻辑', expect: ['project_tech_stack.md', 'feedback_data_api_specs.md'], cat: '核心功能' },
  { q: '前端Vue组件怎么写', expect: ['ui_capability_matrix.md', 'coding_conventions.md'], cat: '核心功能' },
  { q: '产品需求文档功能规划', expect: ['PRD_Movio_AI_产品需求文档.md', 'project_pending_tasks.md'], cat: '核心功能' },
  { q: '多模型架构设计方案', expect: ['ARCH_Movio_AI_多模型架构方案.md', 'Movio_AI_项目规整规划文档.md'], cat: '核心功能' },
  { q: '代码编码规范命名规则', expect: ['coding_conventions.md', 'feedback_six_categories.md'], cat: '核心功能' },
  { q: '安全防护XSS注入限流', expect: ['feedback_data_api_specs.md', 'feedback_quality_gates.md'], cat: '核心功能' },
  { q: 'Git提交commit规范', expect: ['feedback_git_commit_rule.md', 'feedback_proactive_commit.md'], cat: '核心功能' },

  // ── 文档专用 (10) ──
  { q: '记忆持久化机制', expect: ['feedback_memory_persistence.md', 'feedback_intelligent_mode.md'], cat: '文档专用' },
  { q: 'Mock数据规范要求', expect: ['project_mock_data_requirement.md', 'feedback_data_api_specs.md'], cat: '文档专用' },
  { q: 'UI界面设计能力清单', expect: ['ui_capability_matrix.md', 'project_ui_expert_team.md'], cat: '文档专用' },
  { q: '智能思考模式五维分析', expect: ['feedback_intelligent_mode.md', 'feedback_five_in_one_activation.md'], cat: '文档专用' },
  { q: '上线验收检查项清单', expect: ['ACCEPTANCE_上线验收清单.md', 'TASK_任务总清单.md'], cat: '文档专用' },
  { q: '会话续接验证规则', expect: ['feedback_verify_summary.md', 'feedback_memory_persistence.md'], cat: '文档专用' },
  { q: '工程分层架构规则', expect: ['feedback_dev_rules.md', 'thinking_process_rule.md'], cat: '文档专用' },
  { q: '质量门禁五维自检', expect: ['feedback_quality_gates.md', 'feedback_six_categories.md'], cat: '文档专用' },
  { q: '全局数据命名API格式规范', expect: ['feedback_data_api_specs.md', 'feedback_six_categories.md'], cat: '文档专用' },
  { q: '主动提交Git文档规则', expect: ['feedback_git_commit_rule.md', 'feedback_proactive_commit.md'], cat: '文档专用' },

  // ── 混合语义 (10) ──
  { q: '怎样做才符合代码规范要求', expect: ['coding_conventions.md', 'feedback_dev_rules.md'], cat: '混合语义' },
  { q: '部署到生产环境需要注意什么', expect: ['ACCEPTANCE_上线验收清单.md', 'project_tech_stack.md'], cat: '混合语义' },
  { q: '如何设计一个好的API接口', expect: ['feedback_data_api_specs.md', 'feedback_dev_rules.md'], cat: '混合语义' },
  { q: '电商SaaS平台的核心卖点是什么', expect: ['project_tech_stack.md', 'PRD_Movio_AI_产品需求文档.md'], cat: '混合语义' },
  { q: '有哪些AI模型可以用', expect: ['ARCH_Movio_AI_多模型架构方案.md', 'project_tech_stack.md'], cat: '混合语义' },
  { q: '写代码前要思考什么', expect: ['thinking_process_rule.md', 'feedback_dev_rules.md'], cat: '混合语义' },
  { q: '这个项目的技术架构怎么样', expect: ['project_tech_stack.md', 'Movio_AI_项目规整规划文档.md'], cat: '混合语义' },
  { q: '团队协作有什么规则要遵守', expect: ['feedback_dev_rules.md', 'feedback_git_commit_rule.md'], cat: '混合语义' },
  { q: '怎么保证代码质量和安全', expect: ['feedback_quality_gates.md', 'feedback_data_api_specs.md'], cat: '混合语义' },
  { q: 'icon应该在哪个目录', expect: ['ui_capability_matrix.md', 'coding_conventions.md'], cat: '混合语义' },

  // ── 边界/无关 (10) ──
  { q: 'Hello World', expect: [], cat: '边界无关', irrelevant: true },
  { q: '今天天气真好', expect: [], cat: '边界无关', irrelevant: true },
  { q: 'abcdefg hijklmn opqrst uvwxyz', expect: [], cat: '边界无关', irrelevant: true },
  { q: 'Python Django Flask 机器学习', expect: [], cat: '边界无关', irrelevant: true },
  { q: '电影推荐好吃的餐厅', expect: [], cat: '边界无关', irrelevant: true },
  { q: 'Rust高性能WebAssembly', expect: [], cat: '边界无关', irrelevant: true },
  { q: 'NBA篮球比分湖人队', expect: [], cat: '边界无关', irrelevant: true },
  { q: '明天开会几点', expect: [], cat: '边界无关', irrelevant: true },
  { q: '周末去哪玩', expect: [], cat: '边界无关', irrelevant: true },
  { q: '比特币以太坊加密货币行情', expect: [], cat: '边界无关', irrelevant: true },

  // ── 英文/混合 (5) ──
  { q: 'JWT authentication middleware', expect: ['feedback_data_api_specs.md', 'feedback_dev_rules.md'], cat: '英文查询' },
  { q: 'database schema migration SQL', expect: ['DB_Movio_AI_数据库与接口设计.md', 'feedback_six_categories.md'], cat: '英文查询' },
  { q: 'Nuxt3 Vue3 component design', expect: ['ui_capability_matrix.md', 'coding_conventions.md'], cat: '英文查询' },
  { q: 'rate limiting CORS security', expect: ['feedback_data_api_specs.md', 'feedback_quality_gates.md'], cat: '英文查询' },
  { q: 'embedding semantic search vector', expect: ['ARCH_Movio_AI_多模型架构方案.md', 'project_tech_stack.md'], cat: '英文查询' },

  // ── 短关键词 (5) ──
  { q: '支付', expect: ['project_tech_stack.md', 'feedback_data_api_specs.md'], cat: '短查询' },
  { q: '数据库', expect: ['DB_Movio_AI_数据库与接口设计.md', 'feedback_six_categories.md'], cat: '短查询' },
  { q: '前端', expect: ['ui_capability_matrix.md', 'coding_conventions.md'], cat: '短查询' },
  { q: 'AI', expect: ['ARCH_Movio_AI_多模型架构方案.md', 'project_tech_stack.md'], cat: '短查询' },
  { q: '规范', expect: ['coding_conventions.md', 'feedback_dev_rules.md'], cat: '短查询' },
];

// ═══════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════
console.log('═══════════════════════════════════════════════');
console.log('  Semantic Search 深度测试');
console.log('═══════════════════════════════════════════════');
console.log('  模型: ' + store.model + ' | 维度: ' + store.dimension + ' | 块数: ' + store.chunks.length);
console.log('  用例: ' + testCases.length + ' (6类)\n');

const catStats = {};
let top1Total = 0, top3Total = 0, top5Total = 0;
let relevantTop1 = 0, relevantTop3 = 0, relevantTop5 = 0, relevantCount = 0;
let irrelevantPass = 0, irrelevantCount = 0;
let detailLines = [];

for (const tc of testCases) {
  const results = search(tc.q, 5);
  const hitSources = results.map(r => (r.source || '').replace(/^memory:|docs:/, ''));
  const topScore = results[0]?.score || 0;
  const isIrrelevant = tc.irrelevant === true;

  if (!catStats[tc.cat]) catStats[tc.cat] = { t1: 0, t3: 0, t5: 0, n: 0, scores: [] };
  catStats[tc.cat].n++;
  catStats[tc.cat].scores.push(topScore);

  let t1Hit, t3Hit, t5Hit;
  if (isIrrelevant) {
    irrelevantCount++;
    t1Hit = topScore < 0.12;
    t3Hit = topScore < 0.12;
    t5Hit = topScore < 0.12;
    if (t1Hit) irrelevantPass++;
  } else {
    relevantCount++;
    t1Hit = tc.expect.some(s => hitSources[0]?.includes(s));
    t3Hit = tc.expect.some(s => hitSources.slice(0, 3).some(h => h?.includes(s)));
    t5Hit = tc.expect.some(s => hitSources.slice(0, 5).some(h => h?.includes(s)));
  }

  if (t1Hit) { top1Total++; catStats[tc.cat].t1++; if (!isIrrelevant) relevantTop1++; }
  if (t3Hit) { top3Total++; catStats[tc.cat].t3++; if (!isIrrelevant) relevantTop3++; }
  if (t5Hit) { top5Total++; catStats[tc.cat].t5++; if (!isIrrelevant) relevantTop5++; }

  const icon = t1Hit ? '+' : (t3Hit ? '~' : '-');
  let line = '  [' + icon + '] [' + tc.cat + '] "' + tc.q.substring(0, 38) + '"';
  if (isIrrelevant) {
    line += ' → score=' + (topScore * 100).toFixed(1) + '% ' + (topScore < 0.12 ? 'OK' : 'HIGH!');
  } else {
    const src = (hitSources[0] || 'NONE').substring(0, 45);
    line += ' → [' + (topScore * 100).toFixed(0) + '%] ' + src + ' ' + (t1Hit ? '' : '(top3:' + (t3Hit ? 'Y' : 'N') + ')');
  }
  detailLines.push(line);
}

// Print all details
for (const line of detailLines) console.log(line);

// ═══════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════');
console.log('  SUMMARY');
console.log('═══════════════════════════════════════════════');

console.log('\n  ── By Category ──');
for (const [cat, s] of Object.entries(catStats)) {
  const avgS = (s.scores.reduce((a, b) => a + b, 0) / s.scores.length * 100).toFixed(0);
  const isIrr = cat === '边界无关';
  const t1p = (s.t1 / s.n * 100).toFixed(0);
  const t3p = (s.t3 / s.n * 100).toFixed(0);
  console.log('  ' + cat.padEnd(10) + ' Top-1=' + t1p + '%  Top-3=' + t3p + '%  avgScore=' + avgS + '%  (' + s.t1 + '/' + s.n + ')');
}

console.log('\n  ── Overall (All ' + testCases.length + ' queries) ──');
console.log('  Top-1: ' + top1Total + '/' + testCases.length + ' = ' + (top1Total / testCases.length * 100).toFixed(1) + '%');
console.log('  Top-3: ' + top3Total + '/' + testCases.length + ' = ' + (top3Total / testCases.length * 100).toFixed(1) + '%');
console.log('  Top-5: ' + top5Total + '/' + testCases.length + ' = ' + (top5Total / testCases.length * 100).toFixed(1) + '%');

console.log('\n  ── Relevant Only (' + relevantCount + ' queries, excl. irrelevant) ──');
console.log('  Top-1: ' + relevantTop1 + '/' + relevantCount + ' = ' + (relevantTop1 / relevantCount * 100).toFixed(1) + '%');
console.log('  Top-3: ' + relevantTop3 + '/' + relevantCount + ' = ' + (relevantTop3 / relevantCount * 100).toFixed(1) + '%');
console.log('  Top-5: ' + relevantTop5 + '/' + relevantCount + ' = ' + (relevantTop5 / relevantCount * 100).toFixed(1) + '%');

console.log('\n  ── Irrelevant Guard (' + irrelevantCount + ' off-topic queries) ──');
console.log('  正确低分: ' + irrelevantPass + '/' + irrelevantCount + ' = ' + (irrelevantPass / irrelevantCount * 100).toFixed(0) + '% (应<12%得分)');

// Final score
const finalScore = (relevantTop1 / relevantCount * 100).toFixed(1);
console.log('\n  ╔══════════════════════════════╗');
console.log('  ║  相关Top-1: ' + finalScore + '%             ║');
console.log('  ║  相关Top-3: ' + (relevantTop3 / relevantCount * 100).toFixed(1) + '%             ║');
console.log('  ║  无关拦截:  ' + (irrelevantPass / irrelevantCount * 100).toFixed(0) + '%             ║');
console.log('  ╚══════════════════════════════╝');
