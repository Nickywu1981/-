/**
 * 一站式商品文案管线 (One-Click Product Copy Pipeline)
 *
 * 商品图 → AI视觉识别 → 多平台标题 + 详情描述 + 多语言翻译
 * 一条调用完成从图片到全平台文案的全流程
 */

import { recognizeProduct } from './productVisionService.js';
import { generateTitles, generateDescription, translateProduct } from './copywritingService.js';
import { BusinessError } from '../utils/businessError.js';
import logger from '../utils/logger.js';

// ==================== 主入口：一键生成全平台文案 ====================

/**
 * @param {Object} params
 * @param {string} params.imageUrl - 商品图 URL
 * @param {string} [params.productName] - 已知商品名（跳过识别）
 * @param {string} [params.category] - 已知类目（提高识别准确率）
 * @param {Array<string>} [params.platforms=['taobao','douyin','amazon']] - 目标平台列表
 * @param {Array<string>} [params.languages=['zh-CN','en']] - 输出语言列表
 * @param {number} [params.titleCount=5] - 每平台生成标题数
 * @param {number} params.userId
 */
export async function generateProductCopy(params) {
  const {
    imageUrl, productName: knownName, category: knownCategory,
    platforms = ['taobao', 'douyin', 'amazon'],
    languages = ['zh-CN', 'en'],
    titleCount = 5,
    userId,
  } = params;

  if (!imageUrl && !knownName) throw new BusinessError(400, 'imageUrl 或 productName 必填其一');

  // === Phase 1: 商品识别 ===
  let productInfo;
  if (knownName) {
    productInfo = {
      productName: knownName,
      category: knownCategory || '',
      sellingPoints: [],
      features: [],
      specs: {},
      style: '',
      colors: [],
      suitableScenes: [],
      targetAudience: '',
      confidence: 1,
    };
  } else {
    productInfo = await recognizeProduct({ imageUrl, category: knownCategory });
  }

  const {
    productName, category, sellingPoints, features, specs,
  } = productInfo;

  const spStr = sellingPoints.join('，');
  const featStr = features.join('，');
  const specStr = Object.entries(specs || {}).map(([k, v]) => `${k}: ${v}`).join('; ');

  // === Phase 2: 多平台标题生成 ===
  const titleResults = {};
  for (const platform of platforms) {
    try {
      const result = await generateTitles(userId, {
        productName, category, sellingPoints: spStr,
        platform, language: 'zh-CN', count: titleCount,
        tone: 'professional',
      });
      titleResults[platform] = result.titles || [];
    } catch (e) {
      logger.warn(`[ProductCopy] 标题生成失败 platform=${platform}: ${e.message}`);
      titleResults[platform] = [];
    }
  }

  // === Phase 3: 详情描述生成 ===
  let description = '';
  try {
    const descResult = await generateDescription(userId, {
      productName, features: featStr, specs: specStr,
      platform: platforms[0], language: 'zh-CN', tone: 'professional',
    });
    description = descResult.description || '';
  } catch (e) {
    logger.warn(`[ProductCopy] 描述生成失败: ${e.message}`);
  }

  // === Phase 4: 多语言翻译 ===
  const translations = {};
  for (const lang of languages.filter((l) => l !== 'zh-CN')) {
    try {
      const trans = await translateProduct(userId, {
        productName, description, features: featStr,
        sourceLang: 'zh-CN', targetLang: lang,
      });
      translations[lang] = trans.translation || '';
    } catch (e) {
      logger.warn(`[ProductCopy] 翻译失败 lang=${lang}: ${e.message}`);
      translations[lang] = '';
    }
  }

  return {
    productInfo: {
      productName,
      category,
      sellingPoints,
      features,
      specs,
      style: productInfo.style,
      colors: productInfo.colors,
      suitableScenes: productInfo.suitableScenes,
      targetAudience: productInfo.targetAudience,
      confidence: productInfo.confidence,
    },
    titles: titleResults,
    description,
    translations,
    generatedAt: new Date().toISOString(),
  };
}

// ==================== 快速单平台生成 ====================

export async function quickProductCopy(params) {
  const { imageUrl, platform = 'douyin', userId } = params;

  // 识别
  const info = await recognizeProduct({ imageUrl });

  // 标题
  const titles = await generateTitles(userId, {
    productName: info.productName,
    category: info.category,
    sellingPoints: info.sellingPoints.join('，'),
    platform,
    count: 3,
  });

  // 描述
  const desc = await generateDescription(userId, {
    productName: info.productName,
    features: info.features.join('，'),
    specs: Object.entries(info.specs || {}).map(([k, v]) => `${k}: ${v}`).join('; '),
    platform,
  });

  return {
    productName: info.productName,
    category: info.category,
    titles: titles.titles || [],
    description: desc.description || '',
    sellingPoints: info.sellingPoints,
    suitableScenes: info.suitableScenes,
  };
}

export default { generateProductCopy, quickProductCopy };
