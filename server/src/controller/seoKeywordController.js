/**
 * SEO 关键词控制器
 */
import { success } from '../utils/response.js';
import * as svc from '../services/seoKeywordService.js';

export async function embedKeywords(req, res) {
  const { productName, platformCode, category, description, count } = req.body;
  const result = await svc.embedSEOKeywords({ productName, platformCode, category, description, count });
  return success(res, result, `SEO关键词嵌入成功 (平台: ${result.platform})`);
}

export async function listPlatforms(req, res) {
  const platforms = svc.listSEOPlatforms();
  return success(res, { platforms, total: platforms.length });
}

export async function getKeywords(req, res) {
  const { platformCode } = req.query;
  if (platformCode) {
    const result = svc.getPlatformKeywords(platformCode);
    return success(res, result);
  }
  // 返回所有平台摘要
  const platforms = svc.listSEOPlatforms();
  return success(res, { platforms, total: platforms.length });
}
