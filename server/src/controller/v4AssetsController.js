/**
 * Movio AI v4.1 — Assets Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import * as assetsDao from '../dao/assetsDao.js';

export const getList = wrapController(async (req, res) => {
  const { page = 1, pageSize = 20, type } = req.query;
  const result = await assetsDao.listUserAssets({ userId: req.user.id, type, page: Number(page), pageSize: Number(pageSize) });
  return success(res, result);
});
