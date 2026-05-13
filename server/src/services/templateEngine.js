/**
 * 电商全场景模板引擎
 *
 * 根据意图分类自动匹配模板 + 变量填充 + 行业子模板选择
 * 覆盖 5 大类：image / detail / video / copywriting / voice
 */
import { image } from './prompts/image.js';
import { detail } from './prompts/detail.js';
import { video } from './prompts/video.js';
import { voice as voiceTpl } from './prompts/voice.js';
import { copywriting } from './prompts/copywriting.js';
import * as promptDao from '../dao/promptDao.js';
import logger from '../utils/logger.js';

// 转义正则特殊字符，防止用户输入导致 RegExp 编译异常
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 模板注册表
const TEMPLATE_REGISTRY = {
  // 图片类
  main_image:     { category: 'image', tpl: image.main_image,     defaults: image.main_image.defaults },
  scene_image:    { category: 'image', tpl: image.scene_image,    defaults: image.scene_image.defaults },
  poster:         { category: 'image', tpl: image.poster,         defaults: image.poster.defaults },
  detail_image:   { category: 'image', tpl: image.detail_image,   defaults: image.detail_image.defaults },
  white_bg:       { category: 'image', tpl: image.white_bg,       defaults: image.white_bg.defaults },
  storyboard:     { category: 'image', tpl: image.storyboard,     defaults: image.storyboard.defaults },

  // 详情页类
  product_detail: { category: 'detail', tpl: detail.product_detail, defaults: detail.product_detail.defaults },
  infographic:    { category: 'detail', tpl: detail.infographic,   defaults: detail.infographic.defaults },

  // 视频类
  main_video:     { category: 'video', tpl: video.main_video,      defaults: video.main_video.defaults },
  ad_video:       { category: 'video', tpl: video.ad_video,        defaults: video.ad_video.defaults },
  action_migrate: { category: 'video', tpl: video.action_migrate,   defaults: video.action_migrate.defaults },
  video_clone:    { category: 'video', tpl: video.video_clone,      defaults: video.video_clone.defaults },

  // 文案类
  copywriting:    { category: 'text', tpl: copywriting.titleGen,   defaults: copywriting.titleGen.defaults },
  description:    { category: 'text', tpl: copywriting.descriptionGen, defaults: copywriting.descriptionGen.defaults },
  script:         { category: 'text', tpl: copywriting.scriptGen,  defaults: copywriting.scriptGen.defaults },
  selling_points: { category: 'text', tpl: { template: '提炼以下商品的{count}个核心卖点：{productName}。原始信息：{rawInfo}。要求：每个卖点一句话概括+2-3句支撑，区分功能性和情感性卖点，标注可视觉化卖点。', system: '你是专业产品卖点提炼专家。' }, defaults: { count: 5, language: 'zh-CN' } },
  translate:      { category: 'text', tpl: copywriting.translate,  defaults: copywriting.translate.defaults },

  // 语音类
  voice:          { category: 'voice', tpl: voiceTpl.voice,        defaults: voiceTpl.voice.defaults },
};

// 行业子模板参数增强（键名统一为 Zod 枚举值）
const INDUSTRY_PARAMS = {
  clothing:  { category: '服装', style: 'fashion editorial', scene: 'urban street / studio', composition: 'full body + detail' },
  beauty:    { category: '美妆', style: 'beauty glam', scene: 'vanity / bathroom', composition: 'macro + flatlay' },
  '3c_digital': { category: '3C数码', style: 'tech minimal', scene: 'desk / dark studio', composition: 'product hero + detail' },
  food:      { category: '食品', style: 'food photography', scene: 'kitchen / dining', composition: 'overhead + close-up' },
  home:      { category: '家居', style: 'interior design', scene: 'living room / bedroom', composition: 'wide + vignette' },
};

// ── DB-backed template cache (bridges admin-edited templates to workflow engine) ──
const _templateCache = new Map();
const _CACHE_TTL_MS = 60_000;
let _cacheLastFullLoad = 0;

async function _loadAllFromDb() {
  try {
    const { list } = await promptDao.listTemplates({ status: 2, page: 1, pageSize: 200 });
    for (const row of list) {
      _templateCache.set(row.template_code, row);
    }
    _cacheLastFullLoad = Date.now();
    logger.info(`[TemplateEngine] Loaded ${list.length} templates from DB`);
  } catch (e) {
    logger.warn('[TemplateEngine] Failed to load templates from DB, using hardcoded fallback', e.message);
  }
}

async function _getDbTemplate(templateCode) {
  if (Date.now() - _cacheLastFullLoad > _CACHE_TTL_MS) {
    await _loadAllFromDb();
  }
  if (_templateCache.has(templateCode)) return _templateCache.get(templateCode);
  try {
    const row = await promptDao.getTemplateByCode(templateCode);
    if (row) {
      _templateCache.set(templateCode, row);
      return row;
    }
  } catch (e) {
    logger.warn(`[TemplateEngine] Failed to fetch template_code=${templateCode}`, e.message);
  }
  return null;
}

function _normalizeDbToEngine(content) {
  return content.replace(/\{\{(\w+)\}\}/g, '{$1}');
}

/** Invalidate cache entry after admin edits a template */
export function invalidateTemplateCache(templateCode) {
  if (templateCode) {
    _templateCache.delete(templateCode);
  } else {
    _templateCache.clear();
    _cacheLastFullLoad = 0;
  }
}

/**
 * 匹配模板并填充变量
 * @param {string} intentId - 意图ID (e.g. 'main_image', 'ad_video')
 * @param {object} variables - 用户/商家提供的变量
 * @param {object} [opts] - 选项 { industry, platform, brandTone }
 * @returns {Promise<{ system: string, prompt: string, intentId: string, category: string }>}
 */
export async function matchAndFill(intentId, variables = {}, opts = {}) {
  // ── 优先查 DB 模板（后台编辑的模板实时生效）──
  let dbOverride = null;
  try {
    dbOverride = await _getDbTemplate(intentId);
  } catch (e) { /* fall through to hardcoded */ }

  if (dbOverride && dbOverride.content) {
    let dbVariables = [];
    if (dbOverride.variables) {
      try {
        dbVariables = typeof dbOverride.variables === 'string'
          ? JSON.parse(dbOverride.variables)
          : dbOverride.variables;
      } catch {}
    }
    const dbSystem = (Array.isArray(dbVariables)
      ? dbVariables.find(v => v.name === 'system')?.default
      : null) || '你是专业的电商内容创作专家。';
    return {
      system: dbSystem,
      prompt: _normalizeDbToEngine(dbOverride.content).trim(),
      intentId,
      category: dbOverride.category || 'text',
      _source: 'db',
    };
  }

  // ── 回退硬编码 TEMPLATE_REGISTRY ──
  const entry = TEMPLATE_REGISTRY[intentId];
  if (!entry) {
    logger.warn('[TemplateEngine] unknown intent, fallback to copywriting', { intentId });
    return matchAndFill('copywriting', variables, opts);
  }

  const { tpl, defaults, category } = entry;

  // 合并参数：defaults < industry < variables < opts
  const industryParams = opts.industry && INDUSTRY_PARAMS[opts.industry]
    ? INDUSTRY_PARAMS[opts.industry]
    : {};

  const merged = {
    ...defaults,
    ...industryParams,
    ...variables,
    platform: opts.platform || variables.platform || defaults.platform || '通用',
    language: variables.language || defaults.language || 'zh-CN',
  };

  // 填充模板变量 {varName}
  let filled = tpl.template;
  for (const [key, val] of Object.entries(merged)) {
    filled = filled.replace(new RegExp(`\\{${escapeRegex(key)}\\}`, 'g'), String(val ?? ''));
  }

  // 清理未填充的占位符
  filled = filled.replace(/\{[\w]+\}/g, '');

  const system = tpl.system || '你是专业的电商内容创作专家。';

  logger.info('[TemplateEngine] template matched', { intentId, category, industry: opts.industry });

  return { system, prompt: filled.trim(), intentId, category };
}

/**
 * 根据意图获取推荐的模型类型
 */
export function getModelHint(intentId) {
  const category = TEMPLATE_REGISTRY[intentId]?.category;
  switch (category) {
    case 'image':  return { type: 'image', provider: 'auto' };
    case 'detail': return { type: 'multi_modal', provider: 'auto' };
    case 'video':  return { type: 'video', provider: 'auto' };
    case 'text':   return { type: 'text', provider: 'auto' };
    case 'voice':  return { type: 'tts', provider: 'edge_tts' };
    default:       return { type: 'text', provider: 'auto' };
  }
}

export { TEMPLATE_REGISTRY, INDUSTRY_PARAMS, invalidateTemplateCache };
export default { matchAndFill, getModelHint, invalidateTemplateCache };
