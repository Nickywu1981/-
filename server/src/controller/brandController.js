import { wrapController } from '../utils/wrapController.js';
import * as brandService from '../services/brandService.js';
import { success as sendSuccess, error as sendError } from '../utils/response.js';

export const getBrand = wrapController(async (req, res, next) => {
    const data = await brandService.getBrandSettings(req.user.id);
    return sendSuccess(res, data);
  })

export const saveBrand = wrapController(async (req, res, next) => {
    const data = await brandService.saveBrandSettings(req.user.id, req.body);
    return sendSuccess(res, data, '品牌设置已更新');
  })
