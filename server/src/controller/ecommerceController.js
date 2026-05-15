/**
 * 电商内容智能中间层 Controller
 * 统一入口 — 覆盖图片/详情页/视频/文案语音四大类
 */
import { wrapController } from '../utils/wrapController.js';
import { processMerchantRequest } from '../services/ecommercePipeline.js';
import { INTENT_TYPES } from '../services/intentClassifier.js';
import { INDUSTRY_PACKS } from '../services/prompts/ecommerceTemplates.js';
import logger from '../utils/logger.js';

export const generate = wrapController(async (req) => {
  const { userInput, productName, productFeatures, sellingPoints, specs, platform, industry, language, tone, extra } = req.body;
  const userId = req.user?.id || req.user?.userId;

  return processMerchantRequest({
    userInput,
    productName,
    productFeatures,
    sellingPoints,
    specs,
    platform: platform || 'taobao',
    industry: industry || null,
    language,
    tone,
    extra,
    ip: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
    ctx: { userId, tenantId: req.tenantId },
  });
});

export const listIntents = wrapController(async () => {
  return Object.values(INTENT_TYPES).map(t => ({
    id: t.id,
    category: t.category,
    label: t.label,
  }));
});

export const listIndustries = wrapController(async () => {
  return Object.entries(INDUSTRY_PACKS).map(([code, pack]) => ({
    code,
    name: pack.name,
    styleKeywords: pack.styleKeywords,
  }));
});
