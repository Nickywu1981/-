import { copywriting, SUPPORTED_LANGUAGES } from './prompts/copywriting.js';
import { infer } from './aiEngine.js';
import { BusinessError } from '../utils/businessError.js';
import * as copywritingDao from '../dao/copywritingDao.js';
import { ERROR_CODE } from '../constants/errorCode.js';

function safeMsg(err) {
  const msg = err?.message || '未知错误';
  return msg.length > 500 ? msg.substring(0, 500) : msg;
}

// 平台规则配置
const PLATFORM_RULES = {
  taobao:   { name: '淘宝', maxTitleLen: 60, keywordSep: ' ', minKeywords: 3, maxKeywords: 10 },
  tmall:    { name: '天猫', maxTitleLen: 60, keywordSep: ' ', minKeywords: 3, maxKeywords: 10 },
  jd:       { name: '京东', maxTitleLen: 80, keywordSep: ' ', minKeywords: 3, maxKeywords: 12 },
  pinduoduo:{ name: '拼多多', maxTitleLen: 60, keywordSep: ' ', minKeywords: 5, maxKeywords: 15 },
  douyin:   { name: '抖音小店', maxTitleLen: 30, keywordSep: '#', minKeywords: 2, maxKeywords: 6 },
  shopee:   { name: 'Shopee', maxTitleLen: 120, keywordSep: ' ', minKeywords: 3, maxKeywords: 10 },
  lazada:   { name: 'Lazada', maxTitleLen: 120, keywordSep: ' ', minKeywords: 3, maxKeywords: 10 },
  amazon:   { name: 'Amazon', maxTitleLen: 200, keywordSep: ' ', minKeywords: 5, maxKeywords: 15 },
  tiktok:   { name: 'TikTok Shop', maxTitleLen: 60, keywordSep: ' ', minKeywords: 2, maxKeywords: 6 },
  xiaohongshu: { name: '小红书', maxTitleLen: 20, keywordSep: ' ', minKeywords: 1, maxKeywords: 3 },
  kuaishou: { name: '快手', maxTitleLen: 30, keywordSep: '#', minKeywords: 2, maxKeywords: 5 },
  alibaba_intl: { name: '阿里巴巴国际站', maxTitleLen: 128, keywordSep: ' ', minKeywords: 3, maxKeywords: 12 },
  wish: { name: 'Wish', maxTitleLen: 200, keywordSep: ' ', minKeywords: 3, maxKeywords: 10 },
};

export { SUPPORTED_LANGUAGES, PLATFORM_RULES };

function buildTitlePrompt({ productName, category, sellingPoints, platform = 'taobao', language = 'zh-CN', count = 5, tone = 'professional', audience = 'general' }) {
  const rule = PLATFORM_RULES[platform] || PLATFORM_RULES.taobao;
  const prompt = copywriting.titleGen.template
    .replace('{productName}', productName)
    .replace('{category}', category || '')
    .replace('{platform}', rule.name)
    .replace('{sellingPoints}', sellingPoints || '')
    .replace('{audience}', audience)
    .replace('{minLength}', String(rule.minKeywords * 5))
    .replace('{maxLength}', String(rule.maxTitleLen))
    .replace('{language}', language)
    .replace('{tone}', tone)
    .replace('{count}', String(count))
    .replace('{platformRules}', platformRulesToString(platform));
  return prompt;
}

function platformRulesToString(platform) {
  const rule = PLATFORM_RULES[platform] || PLATFORM_RULES.taobao;
  return `Platform requirements: max ${rule.maxTitleLen} chars, ${rule.minKeywords}-${rule.maxKeywords} keywords, use "${rule.keywordSep}" as separator`;
}

function buildDescriptionPrompt({ productName, features, specs, platform = 'taobao', language = 'zh-CN', tone = 'professional' }) {
  return copywriting.descriptionGen.template
    .replace('{productName}', productName)
    .replace('{features}', features || '')
    .replace('{specs}', specs || '')
    .replace('{platform}', PLATFORM_RULES[platform]?.name || platform)
    .replace('{language}', language)
    .replace('{tone}', tone);
}

export async function generateTitles(userId, params) {
  if (!params.productName) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  const prompt = buildTitlePrompt(params);
  const modelId = params.model || 'deepseek-v4-flash';
  const startTime = Date.now();
  try {
    const wrapped = await infer(modelId, { prompt, temperature: 0.7, maxTokens: 1024 });
    const out = wrapped.output;
    const tokenUsed = out.usage?.totalTokens || 0;
    await copywritingDao.insertHistory({ userId, type: 'title', inputs: params, outputs: out.text, modelId, tokenUsed });
    return { titles: parseTitleList(out.text), tokenUsed, model: wrapped.modelId, latency: Date.now() - startTime };
  } catch (err) {
    await copywritingDao.insertHistory({ userId, type: 'title', inputs: params, outputs: null, modelId, tokenUsed: 0, status: 'failed', errorMsg: safeMsg(err) });
    throw err;
  }
}

export async function generateDescription(userId, params) {
  if (!params.productName) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  const prompt = buildDescriptionPrompt(params);
  const modelId = params.model || 'deepseek-v4-flash';
  const startTime = Date.now();
  try {
    const wrapped = await infer(modelId, { prompt, temperature: 0.7, maxTokens: 2048 });
    const out = wrapped.output;
    const tokenUsed = out.usage?.totalTokens || 0;
    await copywritingDao.insertHistory({ userId, type: 'description', inputs: params, outputs: out.text, modelId, tokenUsed });
    return { description: out.text, tokenUsed, model: wrapped.modelId, latency: Date.now() - startTime };
  } catch (err) {
    await copywritingDao.insertHistory({ userId, type: 'description', inputs: params, outputs: null, modelId, tokenUsed: 0, status: 'failed', errorMsg: safeMsg(err) });
    throw err;
  }
}

export async function translateProduct(userId, { productName, description, features, sourceLang = 'zh-CN', targetLang = 'en', model: modelId = 'deepseek-v4-flash' }) {
  if (!productName) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  const prompt = copywriting.translate.template
    .replace('{productName}', productName)
    .replace('{description}', description || '')
    .replace('{features}', features || '')
    .replace('{sourceLang}', sourceLang)
    .replace('{targetLang}', targetLang);
  const startTime = Date.now();
  try {
    const wrapped = await infer(modelId, { prompt, temperature: 0.3, maxTokens: 2048 });
    const out = wrapped.output;
    const tokenUsed = out.usage?.totalTokens || 0;
    await copywritingDao.insertHistory({ userId, type: 'translate', inputs: { sourceLang, targetLang, productName }, outputs: out.text, modelId, tokenUsed });
    return { translation: out.text, tokenUsed, model: wrapped.modelId, latency: Date.now() - startTime };
  } catch (err) {
    await copywritingDao.insertHistory({ userId, type: 'translate', inputs: { sourceLang, targetLang, productName }, outputs: null, modelId, tokenUsed: 0, status: 'failed', errorMsg: safeMsg(err) });
    throw err;
  }
}

export async function getHistory(userId, { type, page = 1, pageSize = 20 }) {
  return copywritingDao.listHistory({ userId, type, page, pageSize });
}

function buildScriptPrompt({ productName, platform = 'douyin', duration = 30, style = 'trending', language = 'zh-CN', hookStyle = 'question' }) {
  const rule = PLATFORM_RULES[platform] || PLATFORM_RULES.douyin;
  const solutionEnd = Math.floor(duration * 0.7);
  const demoEnd = Math.floor(duration * 0.9);
  return copywriting.scriptGen.template
    .replace('{productName}', productName)
    .replace('{platform}', rule.name)
    .replace('{duration}', String(duration))
    .replace('{style}', style)
    .replace('{language}', language)
    .replace('{hookStyle}', hookStyle)
    .replace('{solutionEnd}', String(solutionEnd))
    .replace('{demoEnd}', String(demoEnd));
}

export async function generateScript(userId, params) {
  if (!params.productName) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  const prompt = buildScriptPrompt(params);
  const modelId = params.model || 'deepseek-v4-flash';
  const startTime = Date.now();
  try {
    const wrapped = await infer(modelId, { prompt, temperature: 0.8, maxTokens: 2048 });
    const out = wrapped.output;
    const tokenUsed = out.usage?.totalTokens || 0;
    await copywritingDao.insertHistory({ userId, type: 'script', inputs: params, outputs: out.text, modelId, tokenUsed });
    return { script: out.text, tokenUsed, model: wrapped.modelId, latency: Date.now() - startTime };
  } catch (err) {
    await copywritingDao.insertHistory({ userId, type: 'script', inputs: params, outputs: null, modelId, tokenUsed: 0, status: 'failed', errorMsg: safeMsg(err) });
    throw err;
  }
}

export async function deleteRecord(id, userId) {
  const ok = await copywritingDao.deleteHistory(id, userId);
  if (!ok) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
}

export function getPlatforms() {
  return PLATFORM_RULES;
}

export function getLanguages() {
  return SUPPORTED_LANGUAGES;
}

function parseTitleList(text) {
  const lines = text.split('\n').filter(l => l.trim()).map(l => l.replace(/^\d+[\.\)、]\s*/, '').trim());
  return lines.length ? lines : [text];
}
