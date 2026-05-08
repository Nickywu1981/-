/**
 * kb-semantic-search.js — 语义相似度搜索
 *
 * 将 memory 文件 + 核心文档分块 → 生成 embedding 向量
 * → 查询时计算余弦相似度 → 返回最相关的上下文
 *
 * 用法:
 *   node server/scripts/kb-semantic-search.js --build        # 构建/重建向量库
 *   node server/scripts/kb-semantic-search.js --query "..."   # 语义搜索
 *   node server/scripts/kb-semantic-search.js --health        # 检查向量库状态
 *
 * 依赖: OPENAI_API_KEY + OPENAI_BASE_URL (ouoi.me 代理)
 * 模型: text-embedding-3-small (1536维, $0.02/1M tokens)
 */
import { writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const memoryDir = resolve(process.env.HOME || process.env.USERPROFILE,
  '.claude/projects/I---------/memory');
const docsDir = resolve(root, 'docs');
const vsPath = resolve(root, 'docs/KB_VECTOR_STORE.json');

// ============================================================
// 配置
// ============================================================

function loadEnv() {
  const envPath = resolve(root, 'server/.env');
  if (!existsSync(envPath)) return {};
  const env = {};
  try {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch {}
  return env;
}

const env = loadEnv();
const API_KEY = env.OPENAI_API_KEY || '';
const BASE_URL = (env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/+$/, '');

// ============================================================
// 读取源文件并分块
// ============================================================

function readFileSafe(path) {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}

function getChunks() {
  const chunks = [];
  let id = 0;

  // 读取 memory 目录所有 .md 文件
  if (existsSync(memoryDir)) {
    for (const f of readdirSync(memoryDir)) {
      if (!f.endsWith('.md')) continue;
      const content = readFileSafe(join(memoryDir, f));
      if (!content.trim()) continue;

      // 跳过 frontmatter
      const body = content.replace(/^---[\s\S]*?---\n*/, '').trim();
      if (!body) continue;

      // 按段落分块 (空行分隔)
      const paragraphs = body.split(/\n{2,}/).filter(p => p.trim().length > 20);
      for (const para of paragraphs) {
        chunks.push({
          id: id++,
          source: `memory:${f}`,
          content: para.trim(),
        });
      }
    }
  }

  // 读取 docs 核心文档 (限制大小)
  const keyDocs = [
    'PRD_Movio_AI_产品需求文档.md',
    'TASK_任务总清单.md',
    'DB_Movio_AI_数据库与接口设计.md',
    'ARCH_Movio_AI_多模型架构方案.md',
    'KB_SNAPSHOT.md',
    'KB_INDEX.md',
  ];
  for (const doc of keyDocs) {
    const docPath = join(docsDir, doc);
    if (!existsSync(docPath)) continue;
    const content = readFileSafe(docPath);
    if (!content.trim()) continue;

    const body = content.replace(/^---[\s\S]*?---\n*/, '').trim();
    const paragraphs = body.split(/\n{2,}/).filter(p => p.trim().length > 20);
    // 从大文档中采样（每3段取1段，避免向量库过大）
    for (let i = 0; i < paragraphs.length; i += 3) {
      chunks.push({
        id: id++,
        source: `docs:${doc}`,
        content: paragraphs[i].trim(),
      });
    }
  }

  return chunks;
}

// ============================================================
// Embedding API 调用
// ============================================================

async function getEmbedding(text, retries = 3) {
  const url = BASE_URL.endsWith('/v1') ? `${BASE_URL}/embeddings` : `${BASE_URL}/v1/embeddings`;
  const body = JSON.stringify({
    model: 'text-embedding-3-small',
    input: text,
  });

  for (let attempt = 0; attempt < retries; attempt++) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body,
      signal: AbortSignal.timeout(30000),
    });

    if (resp.status === 429) {
      const wait = Math.pow(2, attempt) * 2000;
      console.error(`[语义搜索] 限流, 等待${wait/1000}s...`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Embedding API ${resp.status}: ${err.slice(0, 200)}`);
    }

    const json = await resp.json();
    return json.data[0].embedding;
  }

  throw new Error('Embedding API 重试耗尽 (429)');
}

// ============================================================
// 余弦相似度
// ============================================================

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================
// 构建向量库
// ============================================================

async function build() {
  console.error('[语义搜索] 读取源文件...');
  const chunks = getChunks();
  console.error(`[语义搜索] ${chunks.length} 个文本块，生成 embedding...`);

  if (!API_KEY) {
    console.error('[语义搜索] ❌ OPENAI_API_KEY 未配置，无法生成 embedding');
    // 降级: 保存纯文本索引
    const store = {
      builtAt: new Date().toISOString(),
      model: 'none',
      dimension: 0,
      chunks,
      embeddings: chunks.map(() => []),
    };
    writeFileSync(vsPath, JSON.stringify(store, null, 2), 'utf8');
    console.error('[语义搜索] ⚠️  已保存纯文本索引 (无向量，仅支持关键词匹配)');
    return store;
  }

  const store = {
    builtAt: new Date().toISOString(),
    model: 'text-embedding-3-small',
    dimension: 1536,
    chunks,
    embeddings: [],
  };

  // 逐条生成 (每次间隔 200ms 避免限流)
  for (let i = 0; i < chunks.length; i++) {
    try {
      const emb = await getEmbedding(chunks[i].content);
      store.embeddings.push(emb);
      if ((i + 1) % 10 === 0) process.stderr.write(`${i + 1}/${chunks.length} `);
    } catch (err) {
      console.error(`\n[语义搜索] ⚠️  chunk ${chunks[i].id} 失败: ${err.message}`);
      store.embeddings.push(null);
    }
    // 每个请求之间间隔 200ms 避免限流
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 200));
  }

  console.error(`\n[语义搜索] ✅ ${store.embeddings.filter(e => e).length}/${chunks.length} 个向量生成成功`);

  writeFileSync(vsPath, JSON.stringify(store, null, 2), 'utf8');
  return store;
}

// ============================================================
// 搜索
// ============================================================

async function search(query, topK = 5) {
  if (!existsSync(vsPath)) {
    console.error('[语义搜索] 向量库不存在，先运行 --build');
    return [];
  }

  const store = JSON.parse(readFileSync(vsPath, 'utf8'));
  const hasEmbeddings = store.embeddings.some(e => e && e.length > 0);

  if (!hasEmbeddings) {
    // 降级: 关键词匹配
    console.error('[语义搜索] ⚠️  无向量，使用关键词匹配');
    const keywords = query.toLowerCase().split(/\s+/);
    const scored = store.chunks.map((chunk, i) => {
      const lower = chunk.content.toLowerCase();
      const score = keywords.filter(k => lower.includes(k)).length / keywords.length;
      return { ...chunk, score, idx: i };
    });
    return scored
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // 向量语义搜索
  console.error(`[语义搜索] 查询: "${query}"`);
  const queryEmb = await getEmbedding(query);

  const scored = store.chunks.map((chunk, i) => {
    const emb = store.embeddings[i];
    if (!emb) return { ...chunk, score: -1, idx: i };
    return { ...chunk, score: cosineSimilarity(queryEmb, emb), idx: i };
  });

  return scored
    .filter(c => c.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// ============================================================
// 主入口
// ============================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--build')) {
    await build();
    console.error('[语义搜索] 向量库构建完成');
    return;
  }

  if (args.includes('--health')) {
    if (!existsSync(vsPath)) {
      console.error('[语义搜索] ❌ 向量库不存在');
      process.exit(1);
    }
    const store = JSON.parse(readFileSync(vsPath, 'utf8'));
    const hasVector = store.embeddings?.some(e => e?.length > 0);
    console.error(`[语义搜索] 状态: ${hasVector ? '✅ 向量库就绪' : '⚠️ 纯文本模式'}`);
    console.error(`[语义搜索] 块数: ${store.chunks?.length || 0}`);
    console.error(`[语义搜索] 构建时间: ${store.builtAt}`);
    process.stdout.write(JSON.stringify({
      health: hasVector ? 'vector' : 'text-only',
      chunks: store.chunks?.length || 0,
      builtAt: store.builtAt,
      model: store.model || 'none',
    }));
    return;
  }

  const queryIdx = args.indexOf('--query');
  if (queryIdx >= 0 && args[queryIdx + 1]) {
    const query = args[queryIdx + 1];
    const topKIdx = args.indexOf('--topK');
    const topK = topKIdx >= 0 ? parseInt(args[topKIdx + 1]) || 5 : 5;

    const results = await search(query, topK);
    console.error(`\n🔍 "${query}" → ${results.length} 条相关结果:\n`);
    for (const r of results) {
      console.error(`  [${(r.score * 100).toFixed(0)}%] ${r.source}`);
      console.error(`    ${r.content.slice(0, 120)}...\n`);
    }
    process.stdout.write(JSON.stringify(results, null, 2));
    return;
  }

  // 默认: 无参数时输出统计
  if (existsSync(vsPath)) {
    const store = JSON.parse(readFileSync(vsPath, 'utf8'));
    const hasVector = store.embeddings?.some(e => e?.length > 0);
    process.stdout.write(JSON.stringify({
      systemMessage: `语义搜索: ${store.chunks?.length||0}块 ${hasVector?'向量模式':'文本模式'}`,
      chunks: store.chunks?.length || 0,
      mode: hasVector ? 'vector' : 'text',
      builtAt: store.builtAt,
    }));
  } else {
    process.stdout.write(JSON.stringify({ systemMessage: '语义搜索: 未构建', mode: 'none' }));
  }
}

main().catch(err => {
  console.error('[语义搜索] 错误:', err.message);
  process.exit(1);
});
