/**
 * 智能抠图/背景移除服务 (Smart Background Removal Service)
 *
 * 封装 SD img2img + gpt-image-2 为独立背景处理端点
 * 支持: 一键白底 / 透明背景 / 背景替换 / 批量抠图
 */

import { BusinessError } from '../utils/businessError.js';
import logger from '../utils/logger.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 白底图生成 ====================

/**
 * 商品图 → 纯白背景图
 */
export async function generateWhiteBg(params) {
  const { imageUrl, productName = '', size = '1024x1024' } = params;
  if (!imageUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  const prompt = `professional e-commerce product photography, pure white background #FFFFFF, studio lighting, product centered, high resolution commercial photography, isolated product shot${productName ? `, product: ${productName}` : ''}`;

  try {
    const { gatewayInfer } = await import('../gateway/aiGatewayHub.js');
    const result = await gatewayInfer('gpt-image-2', {
      prompt,
      imageUrl,
      size,
      n: 1,
    }, { taskType: 'white_bg', source: 'bg-removal' });

    return {
      whiteBgUrl: result?.images?.[0]?.url || result?.url || null,
      originalUrl: imageUrl,
      model: 'gpt-image-2',
    };
  } catch (e) {
    // 降级到 SD img2img
    try {
      const { gatewayInfer } = await import('../gateway/aiGatewayHub.js');
      const fallback = await gatewayInfer('stable-diffusion-img2img', {
        prompt,
        initImage: imageUrl,
        negativePrompt: 'background, shadow, floor, furniture, text, watermark',
        steps: 25,
        cfgScale: 9,
      }, { taskType: 'white_bg', source: 'bg-removal-fallback' });

      return {
        whiteBgUrl: fallback?.images?.[0]?.url || fallback?.url || fallback?.imageUrl || null,
        originalUrl: imageUrl,
        model: 'stable-diffusion-img2img',
        fallback: true,
      };
    } catch (e2) {
      throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
    }
  }
}

// ==================== 背景替换 ====================

/**
 * 商品图 → 替换为指定场景背景
 */
export async function replaceBackground(params) {
  const { imageUrl, bgPrompt, productName = '', size = '1024x1024' } = params;
  if (!imageUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  if (!bgPrompt) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  const prompt = `professional product photography, ${bgPrompt}, ${productName}, commercial quality, realistic lighting, 8k`;

  try {
    const { gatewayInfer } = await import('../gateway/aiGatewayHub.js');
    const result = await gatewayInfer('gpt-image-2', {
      prompt,
      imageUrl,
      size,
      n: 1,
    }, { taskType: 'bg_replace', source: 'bg-removal' });

    return {
      resultUrl: result?.images?.[0]?.url || result?.url || null,
      originalUrl: imageUrl,
      bgPrompt,
      model: 'gpt-image-2',
    };
  } catch (e) {
    logger.error('[BgRemoval] 背景替换失败', { error: e.message });
    throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
  }
}

// ==================== 批量抠图 ====================

/**
 * 批量生成白底图
 */
export async function batchWhiteBg(imageUrls, productName = '') {
  if (!imageUrls?.length) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  const results = [];
  for (let i = 0; i < imageUrls.length; i++) {
    try {
      const r = await generateWhiteBg({ imageUrl: imageUrls[i], productName });
      results.push({ index: i, originalUrl: imageUrls[i], ...r });
    } catch (e) {
      results.push({ index: i, originalUrl: imageUrls[i], error: e.message });
    }
  }

  return {
    total: imageUrls.length,
    success: results.filter((r) => !r.error).length,
    failed: results.filter((r) => r.error).length,
    results,
  };
}

// ==================== 场景模板 ====================

export const BG_TEMPLATES = {
  white: { label: '纯白底', prompt: 'pure white background #FFFFFF, studio lighting, no shadows' },
  natural: { label: '自然光', prompt: 'natural daylight, soft shadows, wooden surface, lifestyle photography' },
  marble: { label: '大理石', prompt: 'elegant white marble surface, luxury product display, soft reflection' },
  outdoor: { label: '户外自然', prompt: 'outdoor garden setting, golden hour sunlight, blurred nature background, bokeh' },
  studio: { label: '影棚暗调', prompt: 'dark studio background, dramatic lighting, premium product photography, spotlight' },
  minimalist: { label: '极简灰', prompt: 'minimalist light grey background, clean Scandinavian style, soft diffused light' },
  warm: { label: '温暖家居', prompt: 'cozy home interior, warm ambient light, lifestyle setting, wooden textures' },
  neon: { label: '赛博霓虹', prompt: 'cyberpunk neon lights, dark background, futuristic product display, colorful reflections' },
};

export default { generateWhiteBg, replaceBackground, batchWhiteBg, BG_TEMPLATES };
