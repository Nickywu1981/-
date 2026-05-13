/**
 * 电商内容智能中间层 Controller
 * 统一入口 — 覆盖图片/详情页/视频/文案语音四大类
 */
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { processMerchantRequest } from '../services/ecommercePipeline.js';
import { INTENT_TYPES } from '../services/intentClassifier.js';
import { INDUSTRY_PACKS } from '../services/prompts/ecommerceTemplates.js';
import logger from '../utils/logger.js';

// POST /api/ecommerce/generate — 统一生成入口
export async function generate(req, res) {
  const { userInput, productName, productFeatures, sellingPoints, specs, platform, industry, language, tone, extra } = req.body;
  const userId = req.user?.id || req.user?.userId;

  const result = await processMerchantRequest({
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

  return success(res, result, '生成成功');
}

// GET /api/ecommerce/intents — 获取所有意图类型
export async function listIntents(req, res) {
  const list = Object.values(INTENT_TYPES).map(t => ({
    id: t.id,
    category: t.category,
    label: t.label,
  }));
  return success(res, { list, total: list.length });
}

// GET /api/ecommerce/industries — 获取支持行业
export async function listIndustries(req, res) {
  const list = Object.entries(INDUSTRY_PACKS).map(([code, pack]) => ({
    code,
    name: pack.name,
    styleKeywords: pack.styleKeywords,
  }));
  return success(res, { list, total: list.length });
}
