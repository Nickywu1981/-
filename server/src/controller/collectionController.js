import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import * as collectionService from '../services/collectionService.js';
import { success } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

const OVERRIDE_FIELDS = ['id', 'tenant_id', 'is_admin', 'role', 'created_at', 'updated_at', 'createdAt', 'updatedAt'];
function safeBody(body) {
  const s = {};
  for (const [k, v] of Object.entries(body)) {
    if (!OVERRIDE_FIELDS.includes(k)) s[k] = v;
  }
  return s;
}

export const listCollections = wrapController(async (req, res) => {
    const result = await collectionService.listByUser(req.user.id, req.query);
    return success(res, result);
});

export const getCollection = wrapController(async (req, res) => {
    const item = await collectionService.getById(req.params.id, req.user.id);
    if (!item) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    return success(res, item);
});

export const createCollection = wrapController(async (req, res) => {
    const id = await collectionService.create({ ...safeBody(req.body), user_id: req.user.id });
    return success(res, { id }, '创建成功');
});

export const updateCollection = wrapController(async (req, res) => {
    const ok = await collectionService.update(req.params.id, req.user.id, safeBody(req.body));
    if (!ok) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    return success(res, null, '更新成功');
});

export const deleteCollection = wrapController(async (req, res) => {
    const ok = await collectionService.remove(req.params.id, req.user.id);
    if (!ok) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    return success(res, null, '删除成功');
});
