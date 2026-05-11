import { wrapController } from '../utils/wrapController.js';
import multilingualService from '../services/multilingualService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const getLanguages = wrapController(async (_req, res) => {
    return success(res, multilingualService.getLanguages());
});

export const getScriptTypes = wrapController(async (_req, res) => {
    return success(res, multilingualService.getScriptTypes());
});

export const buildPrompt = wrapController(async (req, res) => {
    const { product, language, scriptType, platform, tone } = req.body;
    if (!product || !language || !scriptType) {
      return error(res, ERROR_CODE.BAD_REQUEST, '缺少必要参数：product, language, scriptType');
    }
    const result = multilingualService.buildMultilingualPrompt({ product, language, scriptType, platform, tone });
    return success(res, result);
});
