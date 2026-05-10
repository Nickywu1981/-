import { wrapController } from '../utils/wrapController.js';
import * as brandService from '../services/brandService.js';
import { success as sendSuccess, error as sendError } from '../utils/response.js';

export const getBrand = wrapController(async (req, res, next) => {
    const data = await brandService.getBrandSettings(req.user.id);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export const saveBrand = wrapController(async (req, res, next) => {
    const data = await brandService.saveBrandSettings(req.user.id, req.body);
    return sendSuccess(res, data, '品牌设置已更新');
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
}
