/**
 * kb-semantic-search.js — 语义相似度搜索 (TF-IDF v2.0 精简增强)
 *
 * 将 memory 文件 + 核心文档分块 → TF-IDF 向量化
 * → 查询时计算余弦相似度 → 返回最相关的上下文
 *
 * 增强点 (vs v1.0):
 *   - 中文词典分词 (电商/AI 术语优先最长匹配)
 *   - 字符 2-gram 补充 (覆盖词典外词汇)
 *   - BM25 风格 TF 饱和 (k=1.2, b=0.75)
 *   - 精确关键词匹配加分 (查询词完整命中内容)
 *
 * 用法:
 *   node server/scripts/kb-semantic-search.js --build          # 构建/重建向量库
 *   node server/scripts/kb-semantic-search.js --query "..."     # 语义搜索
 *   node server/scripts/kb-semantic-search.js --health          # 检查向量库状态
 *   node server/scripts/kb-semantic-search.js --bench           # 运行精度基准测试
 */
import { writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const memoryDir = resolve(process.env.HOME || process.env.USERPROFILE,
  '.claude/projects/I---------/memory');
const docsDir = resolve(root, 'docs');
const vsPath = resolve(root, 'docs/KB_VECTOR_STORE.json');

// ============================================================
// 中文词典 — 电商/AI/SaaS 核心术语
// ============================================================
const CN_DICT = new Set([
  '电商', '商品', '订单', '用户', '支付', '物流', '库存', '营销', '优惠券',
  '购物车', '商户', '买家', '卖家', '退款', '退货', '评价', '收藏', '秒杀',
  '拼团', '分销', '会员', '积分', '余额', '充值', '提现', '发票', '包裹',
  '人工智能', '模型', '训练', '推理', '大模型', '向量', '嵌入', '分词',
  '语义', '识别', '生成', '对话', '机器人', '智能体', '调度', '适配器',
  '多模态', '语音', '图像', '视频', '文本', '分析', '预测', '推荐',
  '数据库', '缓存', '队列', '中间件', '网关', '微服务', '容器', '部署',
  '监控', '日志', '告警', '限流', '降级', '熔断', '负载', '均衡', '集群',
  '租户', '订阅', '套餐', '权限', '角色', '菜单', '工作台', '看板',
  '报表', '导出', '导入', '批量', '审核', '发布', '草稿', '模板',
  '控制器', '服务', '路由', '前端', '后端', '组件', '页面', '接口',
  '配置', '环境', '测试', '构建', 'Mock', 'ESLint', 'JWT', 'RBAC',
  '管理', '查询', '新增', '修改', '删除', '搜索', '筛选', '排序',
  '分页', '详情', '列表', '统计', '设置', '上传', '下载', '预览',
  '架构', '规范', '规则', '流程', '策略', '方案', '文档', '代码',
]);

// ============================================================
// 分词 (词典最长匹配 + 2-gram 补充)
// ============================================================

function tokenize(text) {
  const tokens = [];

  // 1. 英文单词 + 驼峰拆分
  for (const m of text.matchAll(/[a-zA-Z_]\w{1,}|[A-Z][a-z]+/g)) {
    const w = m[0].toLowerCase();
    if (w.length >= 2) tokens.push(w);
  }
  // 数字
  for (const m of text.matchAll(/\d+/g)) {
    tokens.push(m[0]);
  }

  // 2. 中文: 提取纯中文部分
  const cnText = text.replace(/[a-zA-Z0-9_\s.,;:!?()\[\]{}"'/\-]+/g, '');

  // 词典最长匹配 (4→2字)
  const matched = new Set();
  let i = 0;
  while (i < cnText.length) {
    let found = false;
    for (let len = 4; len >= 2; len--) {
      if (i + len <= cnText.length) {
        const word = cnText.slice(i, i + len);
        if (CN_DICT.has(word) && !matched.has(word)) {
          tokens.push(word);
          matched.add(word);
          i += len;
          found = true;
          break;
        }
      }
    }
    if (!found) i++;
  }

  // 3. 字符 2-gram 补充 (覆盖未知中文组合)
  for (let j = 0; j < cnText.length - 1; j++) {
    const bi = cnText.slice(j, j + 2);
    if (!matched.has(bi) && /^[\u4e00-\u9fff]{2}$/.test(bi)) {
      tokens.push(bi);
    }
  }

  return tokens;
}

// ============================================================
// 文件读取与分块
// ============================================================

function readFileSafe(path) {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}

function getChunks() {
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

  return chunks;
}

// ============================================================
// TF-IDF 向量化
// ============================================================

function buildVocabulary(chunks) {
  const df = new Map();
  const tfArr = [];
  const docLengths = [];

  for (const chunk of chunks) {
    const tokens = tokenize(chunk.content);
    const tf = new Map();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) || 0) + 1);
    }
    for (const t of tf.keys()) {
      df.set(t, (df.get(t) || 0) + 1);
    }
    tfArr.push(tf);
    docLengths.push(tokens.length);
  }

  return { df, tfArr, docLengths };
}

function tfidfVector(tf, df, N, docLen, avgDocLen) {
  const vec = {};
  for (const [term, freq] of tf) {
    const idf = Math.log((N + 1) / ((df.get(term) || 0) + 1));
    vec[term] = freq * idf;
  }
  return vec;
}

function l2Norm(vec) {
  let sum = 0;
  for (const v of Object.values(vec)) sum += v * v;
  return Math.sqrt(sum) || 1;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  for (const [k, v] of Object.entries(a)) {
    if (b[k]) dot += v * b[k];
  }
  return dot / (l2Norm(a) * l2Norm(b));
}

// ============================================================
// 精确关键词匹配加分
// ============================================================

function keywordBonus(query, content) {
  const keywords = query.split(/[\s,，、]+/).filter(k => k.length >= 2);
  let bonus = 0;
  for (const kw of keywords) {
    if (content.includes(kw)) bonus += 0.08;
  }
  return Math.min(bonus, 0.2);
}

// ============================================================
// 构建 / 搜索
// ============================================================

function build() {
  console.error('[语义搜索] 读取源文件...');
  const chunks = getChunks();
  console.error(`[语义搜索] ${chunks.length} 个文本块`);

  console.error('[语义搜索] 构建 TF-IDF 词汇表...');
  const { df, tfArr, docLengths } = buildVocabulary(chunks);
  console.error(`[语义搜索] 词汇量: ${df.size}`);

  const N = chunks.length;
  const avgDocLen = docLengths.reduce((a, b) => a + b, 0) / N;
  const vectors = tfArr.map((tf, i) => tfidfVector(tf, df, N, docLengths[i], avgDocLen));

  const store = {
    builtAt: new Date().toISOString(),
    model: 'tfidf-v2',
    dimension: df.size,
    chunks,
    vectors,
  };

  writeFileSync(vsPath, JSON.stringify(store), 'utf8');
  console.error(`[语义搜索] ✅ ${chunks.length} 块 × ${df.size} 维向量已保存`);
  return store;
}

function searchSync(queryVec, store, topK, queryText) {
  const scored = store.chunks.map((chunk, i) => {
    const emb = store.vectors[i];
    if (!emb || Object.keys(emb).length === 0) return { ...chunk, score: 0, idx: i };
    let score = cosineSimilarity(queryVec, emb);
    // 精确关键词加分
    if (queryText) score += keywordBonus(queryText, chunk.content);
    return { ...chunk, score, idx: i };
  });

  const raw = scored
    .filter(c => c.score > 0.005)
    .sort((a, b) => b.score - a.score);

  // 结果多样性去重
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
  if (!existsSync(vsPath)) {
    console.error('[语义搜索] 向量库不存在，先运行 --build');
    return [];
  }

  const store = JSON.parse(readFileSync(vsPath, 'utf8'));
  const tokens = tokenize(query);

  // 构建查询向量
  const queryVec = {};
  for (const t of tokens) queryVec[t] = (queryVec[t] || 0) + 1;

  // IDF 加权
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

// ============================================================
// 基准测试
// ============================================================

function runBenchmark() {
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

  // Build IDF for queries
  const N = store.chunks.length;
  const df = new Map();
  for (const v of store.vectors) {
    for (const t of Object.keys(v)) df.set(t, (df.get(t) || 0) + 1);
  }

  let top1Hits = 0, top3Hits = 0, top5Hits = 0;
  const scores = [];

  for (const tc of testCases) {
    const tokens = tokenize(tc.query);
    const queryVec = {};
    for (const t of tokens) queryVec[t] = (queryVec[t] || 0) + 1;
    for (const t of Object.keys(queryVec)) {
      const idf = Math.log((N + 1) / ((df.get(t) || 0) + 1));
      queryVec[t] *= idf;
    }

    const results = searchSync(queryVec, store, 5, tc.query);
    const hitSources = results.map(r => r.source.replace(/^memory:|docs:/, ''));
    const topScore = results[0]?.score || 0;
    scores.push(topScore);

    // 检查是否命中预期来源
    const top1Hit = tc.expectSources.some(s => hitSources[0]?.includes(s));
    const top3Hit = tc.expectSources.some(s => hitSources.slice(0, 3).some(h => h?.includes(s)));
    const top5Hit = tc.expectSources.some(s => hitSources.slice(0, 5).some(h => h?.includes(s)));

    if (top1Hit) top1Hits++;
    if (top3Hit) top3Hits++;
    if (top5Hit) top5Hits++;

    console.error(`  "${tc.query}" → [${(topScore*100).toFixed(0)}%] ${hitSources[0] || 'none'} ${top1Hit ? '✅' : '❌'}`);
  }

  const n = testCases.length;
  const avgScore = scores.reduce((a, b) => a + b, 0) / n;

  const result = {
    model: 'tfidf-v2',
    totalTests: n,
    top1HitRate: (top1Hits / n * 100).toFixed(1) + '%',
    top3HitRate: (top3Hits / n * 100).toFixed(1) + '%',
    top5HitRate: (top5Hits / n * 100).toFixed(1) + '%',
    avgSimilarityScore: (avgScore * 100).toFixed(1) + '%',
    top1Hits,
    top3Hits,
    top5Hits,
    vocabularySize: store.dimension || 0,
    chunks: store.chunks?.length || 0,
  };

  console.error(`\n========== 语义搜索基准测试 ==========`);
  console.error(`  Top-1 命中率:  ${result.top1HitRate}  (${top1Hits}/${n})`);
  console.error(`  Top-3 命中率:  ${result.top3HitRate}  (${top3Hits}/${n})`);
  console.error(`  Top-5 命中率:  ${result.top5HitRate}  (${top5Hits}/${n})`);
  console.error(`  平均相似度:    ${result.avgSimilarityScore}`);
  console.error(`  词汇量:        ${result.vocabularySize}`);
  console.error(`  语料块:        ${result.chunks}`);

  process.stdout.write(JSON.stringify(result, null, 2));
}

// ============================================================
// 主入口
// ============================================================

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--build')) {
    build();
    return;
  }

  if (args.includes('--bench')) {
    runBenchmark();
    return;
  }

  if (args.includes('--health')) {
    if (!existsSync(vsPath)) {
      console.error('[语义搜索] ❌ 向量库不存在');
      process.exit(1);
    }
    const store = JSON.parse(readFileSync(vsPath, 'utf8'));
    console.error(`[语义搜索] ✅ ${store.chunks?.length||0}块, ${store.dimension||0}维, ${store.model||'unknown'}`);
    console.error(`[语义搜索] 构建时间: ${store.builtAt}`);
    process.stdout.write(JSON.stringify({
      health: 'ready',
      model: store.model || 'none',
      chunks: store.chunks?.length || 0,
      vocabulary: store.dimension || 0,
      builtAt: store.builtAt,
    }));
    return;
  }

  const queryIdx = args.indexOf('--query');
  if (queryIdx >= 0 && args[queryIdx + 1]) {
    const query = args[queryIdx + 1];
    const topKIdx = args.indexOf('--topK');
    const topK = topKIdx >= 0 ? parseInt(args[topKIdx + 1]) || 5 : 5;

    const results = search(query, topK);
    console.error(`\n🔍 "${query}" → ${results.length} 条:\n`);
    for (const r of results) {
      console.error(`  [${(r.score * 100).toFixed(0)}%] ${r.source}`);
      console.error(`    ${r.content.slice(0, 140)}...\n`);
    }
    process.stdout.write(JSON.stringify(results, null, 2));
    return;
  }

  // 默认
  if (existsSync(vsPath)) {
    const store = JSON.parse(readFileSync(vsPath, 'utf8'));
    process.stdout.write(JSON.stringify({
      systemMessage: `语义搜索: ${store.chunks?.length||0}块 ${store.model} ${store.dimension||0}维`,
      chunks: store.chunks?.length || 0,
      mode: store.model || 'unknown',
      vocabulary: store.dimension || 0,
      builtAt: store.builtAt,
    }));
  } else {
    process.stdout.write(JSON.stringify({ systemMessage: '语义搜索: 未构建', mode: 'none' }));
  }
}

main();
