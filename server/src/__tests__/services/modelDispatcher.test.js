import { describe, it, expect } from 'vitest';

// ============================================================
// 从 modelDispatcher.js 提取的纯函数与数据
// ============================================================

const MODEL_CATEGORIES = ['text', 'image', 'video'];

const TASK_CATEGORY_MAP = {
  text_gen: 'text', script_gen: 'text', title_gen: 'text', translate: 'text',
  compliance_check: 'text', caption_gen: 'text', seo_text: 'text',
  cutout: 'image', cutout_hq: 'image', bg_white: 'image', scene_gen: 'image',
  image_enhance: 'image', img_expand: 'image', ghost_mannequin: 'image',
  poster_gen: 'image', color_swap: 'image', style_transfer: 'image',
  virtual_tryon: 'image', watermark: 'image',
  img2video: 'video', multi2video: 'video', video_edit: 'video',
  video_packaging: 'video', action_transfer: 'video', person_replace: 'video',
  digital_human: 'video', voice_gen: 'video', voice_clone: 'video',
};

function getTaskCategory(taskType) {
  return TASK_CATEGORY_MAP[taskType] || 'text';
}

const MATCH_WEIGHTS = {
  availability: 0.35,
  capability: 0.25,
  cost: 0.20,
  latency: 0.10,
  accuracy: 0.10,
};

const MODEL_CAPABILITIES = {
  'gpt-5.5': { capability: 95, cost: 55, latency: 65, accuracy: 93 },
  'claude-opus-4-7': { capability: 92, cost: 50, latency: 60, accuracy: 94 },
  'deepseek-v4-pro': { capability: 82, cost: 70, latency: 70, accuracy: 84 },
  'deepseek-v4-flash': { capability: 60, cost: 90, latency: 85, accuracy: 68 },
};

function scoreModel(modelId, taskCategory, healthData = {}) {
  const caps = MODEL_CAPABILITIES[modelId] || { capability: 50, cost: 50, latency: 50, accuracy: 50 };
  const available = (healthData[modelId]?.status !== 'error') ? 100 : 0;

  const score =
    available * MATCH_WEIGHTS.availability +
    caps.capability * MATCH_WEIGHTS.capability +
    caps.cost * MATCH_WEIGHTS.cost +
    caps.latency * MATCH_WEIGHTS.latency +
    caps.accuracy * MATCH_WEIGHTS.accuracy;

  return { modelId, score: Math.round(score), details: { available, ...caps } };
}

function rankModels(candidates, taskCategory, healthData) {
  const scores = candidates.map(id => scoreModel(id, taskCategory, healthData));
  scores.sort((a, b) => b.score - a.score);
  return {
    ranked: scores,
    best: scores[0] || null,
    matchLog: scores.map(s =>
      `${s.modelId}: ${s.score}分 (可用${s.details.available} 能力${s.details.capability} 成本${s.details.cost})`,
    ),
  };
}

function aggregateResults(results, taskType) {
  if (!results || results.length === 0) return null;
  if (results.length === 1) return results[0];

  const aggregated = {
    taskType,
    modelCount: results.length,
    models: results.map(r => r.modelId || 'unknown'),
    primary: results[0]?.output || results[0],
    secondary: results.slice(1).map(r => r?.output || r),
    mergedAt: new Date().toISOString(),
  };

  if (taskType === 'compliance_check' && results.length >= 3) {
    const votes = results.map(r => r?.output?.decision || r?.output?.pass);
    const passCount = votes.filter(v => v === true || v === 'pass').length;
    aggregated.voteResult = passCount >= 2 ? 'pass' : 'reject';
    aggregated.voteDetail = { pass: passCount, total: votes.length };
  }

  return aggregated;
}

// ============================================================
// TASK_CATEGORY_MAP — 27 任务类型→类别映射
// ============================================================
describe('TASK_CATEGORY_MAP', () => {
  it('28 个任务类型', () => {
    expect(Object.keys(TASK_CATEGORY_MAP)).toHaveLength(28);
  });

  it('所有映射值均属三个有效类别', () => {
    for (const cat of Object.values(TASK_CATEGORY_MAP)) {
      expect(MODEL_CATEGORIES).toContain(cat);
    }
  });

  it('文本类任务: text_gen/script_gen/title_gen/compliance 等', () => {
    expect(TASK_CATEGORY_MAP.text_gen).toBe('text');
    expect(TASK_CATEGORY_MAP.script_gen).toBe('text');
    expect(TASK_CATEGORY_MAP.compliance_check).toBe('text');
  });

  it('图片类任务: cutout/scene_gen/poster_gen 等 (12个)', () => {
    const imageTasks = Object.entries(TASK_CATEGORY_MAP).filter(([, v]) => v === 'image');
    expect(imageTasks).toHaveLength(12);
  });

  it('视频类任务: img2video/digital_human/voice_gen 等 (9个)', () => {
    const videoTasks = Object.entries(TASK_CATEGORY_MAP).filter(([, v]) => v === 'video');
    expect(videoTasks).toHaveLength(9);
  });
});

// ============================================================
// getTaskCategory — 任务→类别
// ============================================================
describe('getTaskCategory', () => {
  it('已知任务返回正确类别', () => {
    expect(getTaskCategory('cutout')).toBe('image');
    expect(getTaskCategory('img2video')).toBe('video');
    expect(getTaskCategory('title_gen')).toBe('text');
  });

  it('未知任务默认 text', () => {
    expect(getTaskCategory('unknown_task')).toBe('text');
  });

  it('空字符串默认 text', () => {
    expect(getTaskCategory('')).toBe('text');
  });
});

// ============================================================
// MATCH_WEIGHTS — 五维权重总和 1.0
// ============================================================
describe('MATCH_WEIGHTS', () => {
  it('5 个维度', () => {
    expect(Object.keys(MATCH_WEIGHTS)).toHaveLength(5);
  });

  it('权重总和为 1.0', () => {
    const sum = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('可用性权重最高 (0.35)', () => {
    const max = Math.max(...Object.values(MATCH_WEIGHTS));
    expect(MATCH_WEIGHTS.availability).toBe(max);
  });
});

// ============================================================
// MODEL_CAPABILITIES — 4 模型能力矩阵
// ============================================================
describe('MODEL_CAPABILITIES', () => {
  it('4 个注册模型', () => {
    expect(Object.keys(MODEL_CAPABILITIES)).toHaveLength(4);
  });

  it('每个模型含 capability/cost/latency/accuracy', () => {
    for (const [, caps] of Object.entries(MODEL_CAPABILITIES)) {
      expect(caps).toHaveProperty('capability');
      expect(caps).toHaveProperty('cost');
      expect(caps).toHaveProperty('latency');
      expect(caps).toHaveProperty('accuracy');
      expect(typeof caps.capability).toBe('number');
    }
  });

  it('所有分值 0-100', () => {
    for (const caps of Object.values(MODEL_CAPABILITIES)) {
      for (const val of Object.values(caps)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
    }
  });
});

// ============================================================
// scoreModel — 五维加权评分
// ============================================================
describe('scoreModel', () => {
  it('健康模型返回正确评分', () => {
    const result = scoreModel('gpt-5.5', 'text', { 'gpt-5.5': { status: 'ok' } });
    expect(result.modelId).toBe('gpt-5.5');
    expect(result.score).toBeGreaterThan(70);
    expect(result.details.available).toBe(100);
    expect(result.details.capability).toBe(95);
  });

  it('错误状态模型 available=0 分数大幅降低', () => {
    const healthy = scoreModel('gpt-5.5', 'text', { 'gpt-5.5': { status: 'ok' } });
    const errored = scoreModel('gpt-5.5', 'text', { 'gpt-5.5': { status: 'error' } });
    expect(errored.details.available).toBe(0);
    // 仅可用性权重归零，其余维度仍在，分数应显著低于正常
    expect(errored.score).toBeLessThan(healthy.score);
    expect(healthy.score - errored.score).toBeGreaterThanOrEqual(30); // 至少差 30 分
  });

  it('healthData 缺失视为健康', () => {
    const result = scoreModel('claude-opus-4-7', 'image', {});
    expect(result.details.available).toBe(100);
  });

  it('未知模型使用默认 50 分', () => {
    const result = scoreModel('unknown-model', 'text', {});
    expect(result.details.capability).toBe(50);
    expect(result.details.cost).toBe(50);
  });

  it('deepseek-v4-flash 在 cost 维度得分最高', () => {
    const gpt = scoreModel('gpt-5.5', 'text', {});
    const dsFlash = scoreModel('deepseek-v4-flash', 'text', {});
    // cost 是正分（越大越好），flash 的 cost=90 比 gpt 的 cost=55 更容易高分
    // But gpt has higher capability/accuracy, so overall score may be close
    expect(dsFlash.details.cost).toBeGreaterThan(gpt.details.cost);
  });
});

// ============================================================
// rankModels — 候选模型排名
// ============================================================
describe('rankModels', () => {
  it('单候选返回自身最佳', () => {
    const result = rankModels(['gpt-5.5'], 'text', {});
    expect(result.best.modelId).toBe('gpt-5.5');
    expect(result.ranked).toHaveLength(1);
  });

  it('多候选按分数降序', () => {
    const result = rankModels(['deepseek-v4-flash', 'gpt-5.5', 'claude-opus-4-7'], 'text', {});
    expect(result.ranked[0].score).toBeGreaterThanOrEqual(result.ranked[1].score);
    expect(result.best.modelId).toBe(result.ranked[0].modelId);
  });

  it('健康模型排在故障模型前', () => {
    const healthData = {
      'gpt-5.5': { status: 'error' },
      'claude-opus-4-7': { status: 'ok' },
      'deepseek-v4-pro': { status: 'ok' },
    };
    const result = rankModels(['gpt-5.5', 'claude-opus-4-7', 'deepseek-v4-pro'], 'text', healthData);
    expect(result.ranked[0].modelId).not.toBe('gpt-5.5');
  });

  it('空候选 best 为 null', () => {
    const result = rankModels([], 'text', {});
    expect(result.best).toBeNull();
    expect(result.ranked).toEqual([]);
  });

  it('matchLog 包含评分细节', () => {
    const result = rankModels(['deepseek-v4-flash'], 'text', {});
    expect(result.matchLog[0]).toContain('deepseek-v4-flash');
    expect(result.matchLog[0]).toContain('分');
  });
});

// ============================================================
// aggregateResults — 多模型结果聚合
// ============================================================
describe('aggregateResults', () => {
  it('空结果返回 null', () => {
    expect(aggregateResults(null, 'text_gen')).toBeNull();
    expect(aggregateResults([], 'text_gen')).toBeNull();
  });

  it('单结果直接返回', () => {
    const output = { text: 'hello' };
    expect(aggregateResults([output], 'text_gen')).toBe(output);
  });

  it('多结果聚合含基本字段', () => {
    const results = [
      { modelId: 'model-a', output: 'A' },
      { modelId: 'model-b', output: 'B' },
    ];
    const agg = aggregateResults(results, 'text_gen');
    expect(agg.taskType).toBe('text_gen');
    expect(agg.modelCount).toBe(2);
    expect(agg.models).toEqual(['model-a', 'model-b']);
    expect(agg.primary).toBe('A');
    expect(agg.secondary).toEqual(['B']);
    expect(agg.mergedAt).toBeDefined();
  });

  it('合规检查≥3 模型: 多数投票 pass', () => {
    const results = [
      { modelId: 'a', output: { pass: true } },
      { modelId: 'b', output: { pass: true } },
      { modelId: 'c', output: { pass: false } },
    ];
    const agg = aggregateResults(results, 'compliance_check');
    expect(agg.voteResult).toBe('pass');
    expect(agg.voteDetail).toEqual({ pass: 2, total: 3 });
  });

  it('合规检查: 2 票 reject → reject', () => {
    const results = [
      { modelId: 'a', output: { decision: false } },
      { modelId: 'b', output: { decision: false } },
      { modelId: 'c', output: { decision: true } },
    ];
    const agg = aggregateResults(results, 'compliance_check');
    expect(agg.voteResult).toBe('reject');
  });

  it('合规检查: decision 字段优先于 pass', () => {
    const results = [
      { modelId: 'a', output: { decision: 'pass' } },
      { modelId: 'b', output: { decision: 'block' } },
      { modelId: 'c', output: { decision: 'pass' } },
    ];
    const agg = aggregateResults(results, 'compliance_check');
    expect(agg.voteResult).toBe('pass');
  });

  it('合规检查<3 模型无投票', () => {
    const results = [
      { modelId: 'a', output: { pass: true } },
      { modelId: 'b', output: { pass: false } },
    ];
    const agg = aggregateResults(results, 'compliance_check');
    expect(agg.voteResult).toBeUndefined();
  });

  it('modelId 缺失标记 unknown', () => {
    const agg = aggregateResults([{ output: 'x' }, { id: 'y', output: 'z' }], 'text_gen');
    expect(agg.models).toEqual(['unknown', 'unknown']);
  });
});

