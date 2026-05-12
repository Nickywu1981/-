/**
 * 商品图 AI 识别服务 (Product Vision Service)
 *
 * 上传商品图 → GPT-4o Vision → 提取结构化商品信息
 * 输出: 品名/类目/卖点/规格/风格/颜色/适用场景
 */

import { BusinessError } from '../utils/businessError.js';
import logger from '../utils/logger.js';

// ==================== 主识别入口 ====================

/**
 * 识别商品图，提取结构化信息
 * @param {Object} params
 * @param {string} params.imageUrl - 商品图片URL（必填）
 * @param {string} [params.category] - 已知类目提示（可选，提高准确率）
 * @param {string} [params.language='zh-CN'] - 输出语言
 */
export async function recognizeProduct(params) {
  const { imageUrl, category = '', language = 'zh-CN' } = params;
  if (!imageUrl) throw new BusinessError(400, 'imageUrl 为必填参数');

  const categoryHint = category ? `\nKnown category hint: ${category}` : '';

  const systemPrompt = `You are an expert e-commerce product analyst. Analyze the product image and extract structured information.
Output language: ${language}
Return ONLY valid JSON, no markdown formatting.${categoryHint}`;

  const userPrompt = `Analyze this product image and return a JSON object with these fields:
- productName: concise product name (max 30 chars in ${language})
- category: product category (e.g. 服装/美妆/3C数码/家居/食品/运动户外)
- subCategory: more specific sub-category
- sellingPoints: array of 3-5 key selling points (each max 30 chars in ${language})
- features: array of 3-5 product features (material, design, function, etc.)
- specs: key specifications as {label: value} object (size, weight, material, color, etc.)
- style: visual style description (1-3 words)
- colors: array of main colors visible in the product
- suitableScenes: array of 2-4 usage scenarios
- targetAudience: target customer description
- suggestedPrice: estimated price range (e.g. "¥50-150")
- confidence: number 0-1 indicating recognition confidence

Image URL: ${imageUrl}`;

  try {
    const { gatewayInfer } = await import('../gateway/aiGatewayHub.js');
    const result = await gatewayInfer('gpt-4o', {
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.3,
      responseFormat: 'json',
      maxTokens: 2000,
    }, { taskType: 'product_recognition', source: 'vision' });

    const text = result?.text || result?.output?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 未返回有效 JSON');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      ...parsed,
      imageUrl,
      recognizedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error(`[ProductVision] 识别失败: ${err.message}`);
    throw new BusinessError(500, `商品识别失败: ${err.message}`);
  }
}

// ==================== 批量识别 ====================

export async function recognizeProductsBatch(imageUrls, category) {
  if (!imageUrls?.length) throw new BusinessError(400, '至少需要一张图片');

  const results = [];
  for (let i = 0; i < imageUrls.length; i++) {
    try {
      const r = await recognizeProduct({ imageUrl: imageUrls[i], category });
      results.push({ index: i, url: imageUrls[i], ...r });
    } catch (e) {
      results.push({ index: i, url: imageUrls[i], error: e.message });
    }
  }

  return {
    total: imageUrls.length,
    recognized: results.filter((r) => !r.error).length,
    failed: results.filter((r) => r.error).length,
    results,
  };
}

export default { recognizeProduct, recognizeProductsBatch };
