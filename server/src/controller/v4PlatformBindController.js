/**
 * Movio AI v4.1 — Platform Bind Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import * as platformBindDao from '../dao/platformBindDao.js';

export const getBindings = wrapController(async (req, res) => {
  const list = await platformBindDao.listByUserId(req.user.id);
  return success(res, { list });
});

export const bind = wrapController(async (req, res) => {
  const { platform, bind_type, account_id, account_name } = req.validated;
  await platformBindDao.upsert(req.user.id, { bind_type, platform, account_id, account_name });
  return success(res, null, '绑定成功');
});

export const unbind = wrapController(async (req, res) => {
  await platformBindDao.deactivate(req.params.id, req.user.id);
  return success(res, null, '解绑成功');
});

export const publish = wrapController(async (req, res) => {
  const { platform, content_url } = req.validated;
  return success(res, { published_url: content_url, platform, status: 'submitted' }, '已提交发布任务');
});
