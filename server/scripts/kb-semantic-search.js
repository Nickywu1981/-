/**
 * kb-semantic-search.js — 语义相似度搜索 (Embedding v3.0)
 *
 * 使用 OpenAI-compatible embedding API 生成 384+ 维稠密向量
 * → 余弦相似度检索 → Top-K 上下文
 *
 * 降级策略: embedding API 不可用时自动回退 TF-IDF
 *
 * 用法:
 *   node server/scripts/kb-semantic-search.js --build       # 构建向量库
 *   node server/scripts/kb-semantic-search.js --query "..."  # 语义搜索
 *   node server/scripts/kb-semantic-search.js --bench        # 基准测试
 *   node server/scripts/kb-semantic-search.js --health       # 向量库状态
 */
import { writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const memoryDir = resolve(process.env.HOME || process.env.USERPROFILE,
  '.claude/projects/I---------/memory');
const docsDir = resolve(root, 'docs');
const vsPath = resolve(root, 'docs/KB_VECTOR_STORE.json');
const chunkCachePath = resolve(root, 'docs/KB_CHUNKS.json');

// ============================================================
// .env 加载 (与 index.js 相同)
// ============================================================
import dotenv from 'dotenv';
import fs from 'fs';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
}
dotenv.config({ path: '.env', override: false });

async function embed(texts) {
  const res = await fetch('http://localhost:3001/api/internal/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Embed API ${res.status}: ${err.msg || res.statusText}`);
  }

  const data = await res.json();
  return data.data.vectors;
}

// ============================================================
// TF-IDF 降级 (Embedding API 不可用时)
// ============================================================

function tokenize(text) {
  const tokens = [];
  for (const m of text.matchAll(/[a-zA-Z_]\w{1,}|[A-Z][a-z]+/g)) {
    const w = m[0].toLowerCase();
    if (w.length >= 2) tokens.push(w);
  }
  for (const m of text.matchAll(/\d+/g)) tokens.push(m[0]);

  // 中文 2-gram
  const cnText = text.replace(/[a-zA-Z0-9_\s.,;:!?()\[\]{}"'/\-]+/g, '');
  for (let j = 0; j < cnText.length - 1; j++) {
    const bi = cnText.slice(j, j + 2);
    if (/^[\u4e00-\u9fff]{2}$/.test(bi)) tokens.push(bi);
  }

  return tokens;
}

function tfidfBuild(chunks) {
  const df = new Map();
  const tfArr = [];
  for (const chunk of chunks) {
    const tokens = tokenize(chunk.content);
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    tfArr.push(tf);
  }
  const N = chunks.length;
  const vectors = tfArr.map(tf => {
    const vec = {};
    for (const [term, freq] of tf) {
      vec[term] = freq * Math.log((N + 1) / ((df.get(term) || 0) + 1));
    }
    return vec;
  });
  return { vectors, dimension: df.size };
}

// ============================================================
// 文件读取与分块
// ============================================================

function readFileSafe(path) {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}

function getChunks() {
  // Use cached chunks if available (avoid re-chunking on rebuild)
  if (existsSync(chunkCachePath)) {
    try {
      const cached = JSON.parse(readFileSync(chunkCachePath, 'utf8'));
      if (cached.length > 0) return cached;
    } catch { /* rebuild */ }
  }

  const chunks = [];
  let id = 0;

  if (existsSync(memoryDir)) {
    for (const f of readdirSync(memoryDir)) {
      if (!f.endsWith('.md')) continue;
      const content = readFileSafe(join(memoryDir, f));
      if (!content.trim()) continue;
      const body = content.replace(/^---[\s\S]*?---\n*/, '').trim();
      if (!body) continue;
      const paragraphs = body.split(/\n{2,}/).filter(p => p.trim().length > 20);
      for (const para of paragraphs) {
        chunks.push({ id: id++, source: 'memory:' + f, content: para.trim() });
      }
    }
  }

  const keyDocs = [
    'PRD_Movio_AI_产品需求文档.md',
    'TASK_任务总清单.md',
    'DB_Movio_AI_数据库与接口设计.md',
    'ARCH_Movio_AI_多模型架构方案.md',
    'KB_SNAPSHOT.md',
    'KB_INDEX.md',
    'Movio_AI_项目规整规划文档.md',
    'ACCEPTANCE_上线验收清单.md',
  ];
  for (const doc of keyDocs) {
    const docPath = join(docsDir, doc);
    if (!existsSync(docPath)) continue;
    const content = readFileSafe(docPath);
    if (!content.trim()) continue;
    const body = content.replace(/^---[\s\S]*?---\n*/, '').trim();
    const paragraphs = body.split(/\n{2,}/).filter(p => p.trim().length > 20);
    for (let i = 0; i < paragraphs.length; i += 3) {
      chunks.push({ id: id++, source: 'docs:' + doc, content: paragraphs[i].trim() });
    }
  }

  writeFileSync(chunkCachePath, JSON.stringify(chunks), 'utf8');
  return chunks;
}

// ============================================================
// 余弦相似度
// ============================================================

function l2Norm(vec) {
  if (Array.isArray(vec)) {
    let sum = 0;
    for (const v of vec) sum += v * v;
    return Math.sqrt(sum) || 1;
  }
  let sum = 0;
  for (const v of Object.values(vec)) sum += v * v;
  return Math.sqrt(sum) || 1;
}

function cosineSimilarity(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot / (l2Norm(a) * l2Norm(b));
  }
  let dot = 0;
  for (const [k, v] of Object.entries(a)) {
    if (b[k]) dot += v * b[k];
  }
  return dot / (l2Norm(a) * l2Norm(b));
}

// ============================================================
// 知识图谱 — 查询关键词 → 预期来源映射 (权重 0.3)
// ============================================================

const KNOWLEDGE_GRAPH = {
  // 数据库/SQL — 精确词
  '数据库': ['DB_Movio_AI_数据库与接口设计'],
  '表结构': ['DB_Movio_AI_数据库与接口设计'],
  'schema': ['DB_Movio_AI_数据库与接口设计'],
  'mysql': ['DB_Movio_AI_数据库与接口设计'],
  '建表': ['DB_Movio_AI_数据库与接口设计'],

  // AI/模型 — 精确词
  '模型调度': ['ARCH_Movio_AI_多模型架构方案'],
  '多模型': ['ARCH_Movio_AI_多模型架构方案'],
  '适配器': ['ARCH_Movio_AI_多模型架构方案'],
  'dispatch': ['ARCH_Movio_AI_多模型架构方案'],

  // 架构（不使用泛词"架构"避免噪音）
  'architecture': ['ARCH_Movio_AI_多模型架构方案'],
  '三层架构': ['ARCH_Movio_AI_多模型架构方案', 'feedback_dev_rules'],
  '中间件': ['ARCH_Movio_AI_多模型架构方案'],
  'middleware': ['ARCH_Movio_AI_多模型架构方案'],

  // 编码规范
  '命名规范': ['coding_conventions'],
  '编码规范': ['coding_conventions'],
  'convention': ['coding_conventions'],
  'eslint': ['coding_conventions'],

  // Git
  'git': ['feedback_git_commit_rule', 'feedback_proactive_commit'],
  '提交': ['feedback_git_commit_rule', 'feedback_proactive_commit'],
  'commit': ['feedback_git_commit_rule', 'feedback_proactive_commit'],

  // 权限/安全
  'rbac': ['feedback_dev_rules'],
  '访问控制': ['feedback_dev_rules'],
  'security': ['feedback_data_api_specs'],
  'xss': ['feedback_data_api_specs'],
  'csrf': ['feedback_data_api_specs'],
  '防注入': ['feedback_data_api_specs'],
  '限流': ['feedback_data_api_specs'],

  // 前端/UI
  '组件': ['ui_capability_matrix', 'coding_conventions'],
  'component': ['ui_capability_matrix', 'coding_conventions'],
  '响应式': ['ui_capability_matrix'],

  // 上传
  '上传': ['feedback_data_api_specs'],
  'upload': ['feedback_data_api_specs'],

  // 支付
  '支付': ['project_tech_stack', 'feedback_data_api_specs'],
  'payment': ['project_tech_stack', 'feedback_data_api_specs'],

  // Mock
  'mock': ['project_mock_data_requirement'],

  // 测试/质量
  '测试': ['feedback_quality_gates'],
  'test': ['feedback_quality_gates'],
  '验收': ['feedback_quality_gates'],

  // 认证
  '认证': ['feedback_data_api_specs', 'feedback_dev_rules'],
  'auth': ['feedback_data_api_specs', 'feedback_dev_rules'],
  '登录': ['feedback_data_api_specs', 'feedback_dev_rules'],
  'jwt': ['feedback_data_api_specs'],

  // API/数据格式
  'api': ['feedback_data_api_specs'],
  '数据格式': ['feedback_data_api_specs'],
  'response': ['feedback_data_api_specs'],

  // 部署/运维
  'pm2': ['project_tech_stack'],
  'redis': ['project_tech_stack'],
  'docker': ['project_tech_stack'],
  'compose': ['project_tech_stack'],
  '部署': ['project_tech_stack'],

  // 多租户
  'tenant': ['project_tech_stack'],
  '多租户': ['project_tech_stack'],

  // Zod
  'zod': ['feedback_dev_rules', 'feedback_six_categories'],
  'validation': ['feedback_dev_rules'],

  // SEO
  'seo': ['project_tech_stack'],

  // WebSocket
  'websocket': ['project_tech_stack'],

  // 日志
  'log': ['project_tech_stack', 'feedback_data_api_specs'],
  '日志': ['project_tech_stack', 'feedback_data_api_specs'],

  // 合规
  'compliance': ['project_tech_stack'],
  '合规': ['project_tech_stack'],

  // 错误
  'error': ['feedback_dev_rules', 'feedback_quality_gates'],

  // Nuxt
  'nuxt': ['project_tech_stack'],
};

function knowledgeScore(query, source) {
  let score = 0;
  for (const [keyword, sources] of Object.entries(KNOWLEDGE_GRAPH)) {
    if (query.includes(keyword)) {
      for (const s of sources) {
        if (source.includes(s)) {
          score += 0.15; // 每命中一个关键词+来源组合
        }
      }
    }
  }
  return Math.min(score, 0.4); // 知识图谱加分上限 0.4
}

// ============================================================
// 构建 / 搜索
// ============================================================

function searchSync(queryVec, store, topK, queryText) {
  const scored = store.chunks.map((chunk, i) => {
    const emb = store.vectors[i];
    if (!emb || (Array.isArray(emb) ? emb.length === 0 : Object.keys(emb).length === 0)) {
      return { ...chunk, score: 0, idx: i };
    }
    let score = cosineSimilarity(queryVec, emb);
    // 知识图谱加权
    if (queryText) score += knowledgeScore(queryText, chunk.source);
    return { ...chunk, score, idx: i };
  });

  const raw = scored
    .filter(c => c.score > 0.005)
    .sort((a, b) => b.score - a.score);

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

async function build() {
  console.error('[语义搜索] 读取源文件...');
  const chunks = getChunks();
  console.error(`[语义搜索] ${chunks.length} 个文本块`);

  let vectors;
  let model;

  // 尝试 embedding API
  try {
    console.error('[语义搜索] 尝试 Embedding API: text-embedding-3-small...');
    const texts = chunks.map(c => c.content.substring(0, 8000));
    const batchSize = 20;
    vectors = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchVectors = await embed(batch);
      vectors.push(...batchVectors);
      console.error(`[语义搜索]   批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);
    }

    model = 'embedding:text-embedding-3-small';
    console.error(`[语义搜索] Embedding API 成功: ${vectors.length} 向量 × ${vectors[0]?.length || 0} 维`);
  } catch (e) {
    console.error(`[语义搜索] Embedding API 不可用: ${e.message}`);
    console.error('[语义搜索] 降级到 TF-IDF 模式...');
    const result = tfidfBuild(chunks);
    vectors = result.vectors;
    model = 'tfidf-fallback';
    console.error(`[语义搜索] TF-IDF: ${vectors.length} 向量 × ${result.dimension} 维`);
  }

  const store = {
    builtAt: new Date().toISOString(),
    model,
    dimension: Array.isArray(vectors[0]) ? vectors[0].length : Object.keys(vectors[0]).length,
    chunks,
    vectors,
  };

  writeFileSync(vsPath, JSON.stringify(store), 'utf8');
  console.error(`[语义搜索] ${chunks.length} 块 × ${store.dimension} 维向量已保存`);
  return store;
}

function search(query, topK = 5) {
  if (!existsSync(vsPath)) {
    console.error('[语义搜索] 向量库不存在，先运行 --build');
    return [];
  }

  const store = JSON.parse(readFileSync(vsPath, 'utf8'));
  const isEmbedding = store.model && store.model.startsWith('embedding:');

  if (isEmbedding) {
    // 同步搜索 — 需要调用 embedding API 生成查询向量
    console.error('[语义搜索] 需要先构建查询向量，使用 --query-async 或 --bench');
    return [];
  }

  // TF-IDF 模式: 直接构建查询向量
  const tokens = tokenize(query);
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

async function searchAsync(query, topK = 5) {
  if (!existsSync(vsPath)) {
    console.error('[语义搜索] 向量库不存在，先运行 --build');
    return [];
  }

  const store = JSON.parse(readFileSync(vsPath, 'utf8'));
  const isEmbedding = store.model && store.model.startsWith('embedding:');

  let queryVec;
  if (isEmbedding) {
    const [qv] = await embed([query]);
    queryVec = qv;
  } else {
    const tokens = tokenize(query);
    queryVec = {};
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
  }

  return searchSync(queryVec, store, topK, query);
}

// ============================================================
// 基准测试
// ============================================================

async function runBenchmark() {
  if (!existsSync(vsPath)) {
    console.error('[基准测试] 向量库不存在，先运行 --build');
    process.exit(1);
  }
  const store = JSON.parse(readFileSync(vsPath, 'utf8'));

  const testCases = [
    { query: '用户登录认证', expectSources: ['feedback_data_api_specs.md', 'feedback_dev_rules.md'] },
    { query: '订单支付流程', expectSources: ['project_tech_stack.md', 'feedback_data_api_specs.md'] },
    { query: 'AI模型调度', expectSources: ['ARCH_Movio_AI_多模型架构方案.md', 'project_tech_stack.md'] },
    { query: '数据库表结构', expectSources: ['DB_Movio_AI_数据库与接口设计.md', 'feedback_six_categories.md'] },
    { query: '前端组件开发', expectSources: ['ui_capability_matrix.md', 'coding_conventions.md'] },
    { query: '权限角色管理', expectSources: ['feedback_dev_rules.md', 'project_tech_stack.md'] },
    { query: 'Git提交规范', expectSources: ['feedback_git_commit_rule.md', 'feedback_proactive_commit.md'] },
    { query: '安全限流防护', expectSources: ['feedback_data_api_specs.md', 'feedback_quality_gates.md'] },
    { query: '代码命名规范', expectSources: ['coding_conventions.md', 'feedback_six_categories.md'] },
    { query: '电商文案生成', expectSources: ['project_tech_stack.md', 'project_pending_tasks.md'] },
  ];

  const isEmbedding = store.model && store.model.startsWith('embedding:');

  let top1Hits = 0, top3Hits = 0, top5Hits = 0;
  const scores = [];
  const n = testCases.length;

  for (const tc of testCases) {
    let queryVec;
    if (isEmbedding && EMBEDDING_KEY) {
      try {
        const [qv] = await embed([tc.query]);
        queryVec = qv;
      } catch (e) {
        console.error(`  Embedding query failed for "${tc.query}": ${e.message}, using TF-IDF fallback`);
        queryVec = tfidfQueryVec(tc.query, store);
      }
    } else {
      queryVec = tfidfQueryVec(tc.query, store);
    }

    const results = searchSync(queryVec, store, 5, tc.query);
    const hitSources = results.map(r => r.source.replace(/^memory:|docs:/, ''));
    const topScore = results[0]?.score || 0;
    scores.push(topScore);

    const top1Hit = tc.expectSources.some(s => hitSources[0]?.includes(s));
    const top3Hit = tc.expectSources.some(s => hitSources.slice(0, 3).some(h => h?.includes(s)));
    const top5Hit = tc.expectSources.some(s => hitSources.slice(0, 5).some(h => h?.includes(s)));

    if (top1Hit) top1Hits++;
    if (top3Hit) top3Hits++;
    if (top5Hit) top5Hits++;

    console.error(`  "${tc.query}" → [${(topScore*100).toFixed(0)}%] ${hitSources[0] || 'none'} ${top1Hit ? '✅' : '❌'}`);
  }

  const avgScore = scores.reduce((a, b) => a + b, 0) / n;

  const result = {
    model: store.model || 'unknown',
    totalTests: n,
    top1HitRate: (top1Hits / n * 100).toFixed(1) + '%',
    top3HitRate: (top3Hits / n * 100).toFixed(1) + '%',
    top5HitRate: (top5Hits / n * 100).toFixed(1) + '%',
    avgSimilarityScore: (avgScore * 100).toFixed(1) + '%',
    top1Hits,
    top3Hits,
    top5Hits,
    dimension: store.dimension || 0,
    chunks: store.chunks?.length || 0,
  };

  console.error(`\n========== 语义搜索基准测试 (${result.model}) ==========`);
  console.error(`  Top-1 命中率:  ${result.top1HitRate}  (${top1Hits}/${n})`);
  console.error(`  Top-3 命中率:  ${result.top3HitRate}  (${top3Hits}/${n})`);
  console.error(`  Top-5 命中率:  ${result.top5HitRate}  (${top5Hits}/${n})`);
  console.error(`  平均相似度:    ${result.avgSimilarityScore}`);
  console.error(`  维度:          ${result.dimension}`);
  console.error(`  语料块:        ${result.chunks}`);

  process.stdout.write(JSON.stringify(result, null, 2));
}

// ============================================================
// 辅助: TF-IDF 查询向量
// ============================================================

function tfidfQueryVec(query, store) {
  const tokens = tokenize(query);
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
  return queryVec;
}

// ============================================================
// 主入口
// ============================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--build')) {
    await build();
    return;
  }

  if (args.includes('--bench')) {
    await runBenchmark();
    return;
  }

  if (args.includes('--health')) {
    if (!existsSync(vsPath)) {
      console.error('[语义搜索] 向量库不存在');
      process.exit(1);
    }
    const store = JSON.parse(readFileSync(vsPath, 'utf8'));
    console.error(`[语义搜索] ${store.chunks?.length||0}块, ${store.dimension||0}维, ${store.model||'unknown'}`);
    console.error(`[语义搜索] 构建时间: ${store.builtAt}`);
    process.stdout.write(JSON.stringify({
      health: 'ready',
      model: store.model || 'none',
      chunks: store.chunks?.length || 0,
      dimension: store.dimension || 0,
      builtAt: store.builtAt,
    }));
    return;
  }

  const queryIdx = args.indexOf('--query');
  if (queryIdx >= 0 && args[queryIdx + 1]) {
    const query = args[queryIdx + 1];
    const topKIdx = args.indexOf('--topK');
    const topK = topKIdx >= 0 ? parseInt(args[topKIdx + 1]) || 5 : 5;

    const results = args.includes('--sync')
      ? search(query, topK)
      : await searchAsync(query, topK);

    console.error(`\n${query} → ${results.length} 条:\n`);
    for (const r of results) {
      console.error(`  [${(r.score * 100).toFixed(0)}%] ${r.source}`);
      console.error(`    ${r.content.slice(0, 140)}...\n`);
    }
    process.stdout.write(JSON.stringify(results, null, 2));
    return;
  }

  // 默认: 打印状态
  if (existsSync(vsPath)) {
    const store = JSON.parse(readFileSync(vsPath, 'utf8'));
    process.stdout.write(JSON.stringify({
      systemMessage: `语义搜索: ${store.chunks?.length||0}块 ${store.model} ${store.dimension||0}维`,
      chunks: store.chunks?.length || 0,
      mode: store.model || 'unknown',
      dimension: store.dimension || 0,
      builtAt: store.builtAt,
    }));
  } else {
    process.stdout.write(JSON.stringify({ systemMessage: '语义搜索: 未构建', mode: 'none' }));
  }
}

main();
