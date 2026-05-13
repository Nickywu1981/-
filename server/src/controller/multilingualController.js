import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import multilingualService from '../services/multilingualService.js';
import { success } from '../utils/response.js';
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
      throw new BusinessError(ERROR_CODE.BAD_REQUEST);
    }
    const result = multilingualService.buildMultilingualPrompt({ product, language, scriptType, platform, tone });
    return success(res, result);
});
