import multilingualService from '../services/multilingualService.js';
import { success, error } from '../utils/response.js';

export async function getLanguages(_req, res) {
  try {
    return success(res, multilingualService.getLanguages());
  } catch (err) { return error(res, 500, err.message); }
}

export async function getScriptTypes(_req, res) {
  try {
    return success(res, multilingualService.getScriptTypes());
  } catch (err) { return error(res, 500, err.message); }
}

export async function buildPrompt(req, res) {
  try {
    const { product, language, scriptType, platform, tone } = req.body;
    if (!product || !language || !scriptType) {
      return error(res, 400, '缺少必要参数：product, language, scriptType');
    }
    const result = multilingualService.buildMultilingualPrompt({ product, language, scriptType, platform, tone });
    return success(res, result);
  } catch (err) { return error(res, 500, err.message); }
}
