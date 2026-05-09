import templateMarketDao from '../dao/templateMarketDao.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export default {
  async search(req, res) {
    try {
      const result = await templateMarketDao.search({
        category: req.query.category || null,
        keyword: req.query.keyword || null,
        sort: req.query.sort || 'download_count',
        page: +req.query.page || 1,
        limit: +req.query.limit || 20,
      });
      return success(res, result);
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
    }
  },

  async detail(req, res) {
    try {
      const tpl = await templateMarketDao.getById(+req.params.id);
      if (!tpl) return error(res, ERROR_CODE.NOT_FOUND, '模板不存在');
      return success(res, tpl);
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
    }
  },

  async download(req, res) {
    try {
      const tpl = await templateMarketDao.getById(+req.params.id);
      if (!tpl) return error(res, ERROR_CODE.NOT_FOUND, '模板不存在');
      if (tpl.price > 0) {
        const purchased = await templateMarketDao.hasPurchased(req.userId, tpl.id);
        if (!purchased) return error(res, ERROR_CODE.PAYMENT_REQUIRED, '请先购买此模板');
      }
      await templateMarketDao.incrementDownload(tpl.id);
      return success(res, { download_url: tpl.preview_images }, '下载成功');
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
    }
  },

  async purchase(req, res) {
    try {
      const tpl = await templateMarketDao.getById(+req.params.id);
      if (!tpl) return error(res, ERROR_CODE.NOT_FOUND, '模板不存在');
      if (tpl.price === 0) return error(res, ERROR_CODE.BAD_REQUEST, '免费模板无需购买');
      await templateMarketDao.recordPurchase(req.userId, tpl.id, tpl.price);
      return success(res, null, '购买成功');
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
    }
  },

  async create(req, res) {
    try {
      const result = await templateMarketDao.create(req.userId, req.validated);
      return success(res, { id: result.id }, '模板发布成功');
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
    }
  },
};
