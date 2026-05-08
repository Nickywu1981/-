import * as brandService from '../services/brandService.js';
import { success as sendSuccess, error as sendError } from '../utils/response.js';

export async function getBrand(req, res, next) {
  try {
    const data = await brandService.getBrandSettings(req.user.id);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function saveBrand(req, res, next) {
  try {
    const data = await brandService.saveBrandSettings(req.user.id, req.body);
    return sendSuccess(res, data, '品牌设置已更新');
  } catch (err) {
    if (err.statusCode) return sendError(res, err.statusCode, err.message);
    next(err);
  }
}
