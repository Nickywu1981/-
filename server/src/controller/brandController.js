import { wrapController } from '../utils/wrapController.js';
import * as brandService from '../services/brandService.js';
import { success } from '../utils/response.js';

export const getBrand = wrapController(async (req, res, next) => {
    const data = await brandService.getBrandSettings(req.user.id);
    return success(res, data);
  });

export const saveBrand = wrapController(async (req, res, next) => {
    const data = await brandService.saveBrandSettings(req.user.id, req.body);
    return success(res, data, '品牌设置已更新');
  });
