/**
 * SEO 关键词控制器
 */
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as svc from '../services/seoKeywordService.js';

export async function embedKeywords(req, res) {
  try {
    const { productName, platformCode, category, description, count } = req.body;
    const result = await svc.embedSEOKeywords({ productName, platformCode, category, description, count });
    return success(res, result, `SEO关键词嵌入成功 (平台: ${result.platform})`);
  } catch (e) {
    return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
  }
}

export async function listPlatforms(req, res) {
  try {
    const platforms = svc.listSEOPlatforms();
    return success(res, { platforms, total: platforms.length });
  } catch (e) {
    return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
  }
}

export async function getKeywords(req, res) {
  try {
    const { platformCode } = req.query;
    if (platformCode) {
      const result = svc.getPlatformKeywords(platformCode);
      return success(res, result);
    }
    const platforms = svc.listSEOPlatforms();
    return success(res, { platforms, total: platforms.length });
  } catch (e) {
    return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
  }
}
