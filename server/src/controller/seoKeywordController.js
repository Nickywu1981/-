/**
 * SEO 关键词控制器
 */
import { wrapController } from '../utils/wrapController.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as svc from '../services/seoKeywordService.js';

export const embedKeywords = wrapController(async (req, res) => {
    const { productName, platformCode, category, description, count } = req.body;
    const result = await svc.embedSEOKeywords({ productName, platformCode, category, description, count });
    return success(res, result, `SEO关键词嵌入成功 (平台: ${result.platform})`);
}

export const listPlatforms = wrapController(async (req, res) => {
    const platforms = svc.listSEOPlatforms();
    return success(res, { platforms, total: platforms.length });
}

export const getKeywords = wrapController(async (req, res) => {
    const { platformCode } = req.query;
    if (platformCode) {
      const result = svc.getPlatformKeywords(platformCode);
      return success(res, result);
    }
    const platforms = svc.listSEOPlatforms();
    return success(res, { platforms, total: platforms.length });
}
