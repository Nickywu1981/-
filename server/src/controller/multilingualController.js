import multilingualService from '../services/multilingualService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export async function getLanguages(_req, res) {
  try {
    return success(res, multilingualService.getLanguages());
  } catch (err) { return error(res, err.status || 500, err.message); }
}

export async function getScriptTypes(_req, res) {
  try {
    return success(res, multilingualService.getScriptTypes());
  } catch (err) { return error(res, err.status || 500, err.message); }
}

export async function buildPrompt(req, res) {
  try {
    const { product, language, scriptType, platform, tone } = req.body;
    if (!product || !language || !scriptType) {
      return error(res, ERROR_CODE.BAD_REQUEST, '缺少必要参数：product, language, scriptType');
    }
    const result = multilingualService.buildMultilingualPrompt({ product, language, scriptType, platform, tone });
    return success(res, result);
  } catch (err) { return error(res, err.status || 500, err.message); }
}
