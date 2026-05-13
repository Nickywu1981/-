import templateMarketDao from '../dao/templateMarketDao.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { wrapController } from '../utils/wrapController.js';

export const search = wrapController(async (req, res) => {
  const result = await templateMarketDao.search({
    category: req.query.category || null,
    keyword: req.query.keyword || null,
    sort: req.query.sort || 'download_count',
    page: +req.query.page || 1,
    limit: +req.query.limit || 20,
  });
  return success(res, result);
});

export const detail = wrapController(async (req, res) => {
  const tpl = await templateMarketDao.getById(+req.params.id);
  if (!tpl) throw new BusinessError(ERROR_CODE.NOT_FOUND);
  return success(res, tpl);
});

export const download = wrapController(async (req, res) => {
  const tpl = await templateMarketDao.getById(+req.params.id);
  if (!tpl) throw new BusinessError(ERROR_CODE.NOT_FOUND);
  if (tpl.price > 0) {
    const purchased = await templateMarketDao.hasPurchased(req.userId, tpl.id);
    if (!purchased) throw new BusinessError(ERROR_CODE.PAYMENT_REQUIRED);
  }
  await templateMarketDao.incrementDownload(tpl.id);
  return success(res, { download_url: tpl.preview_images }, '下载成功');
});

export const purchase = wrapController(async (req, res) => {
  const tpl = await templateMarketDao.getById(+req.params.id);
  if (!tpl) throw new BusinessError(ERROR_CODE.NOT_FOUND);
  if (tpl.price === 0) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
  await templateMarketDao.recordPurchase(req.userId, tpl.id, tpl.price);
  return success(res, null, '购买成功');
});

export const create = wrapController(async (req, res) => {
  const result = await templateMarketDao.create(req.userId, req.validated);
  return success(res, { id: result.id }, '模板发布成功');
});
