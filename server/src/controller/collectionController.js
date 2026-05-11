import { wrapController } from '../utils/wrapController.js';
import * as collectionService from '../services/collectionService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const listCollections = wrapController(async (req, res) => {
    const result = await collectionService.listByUser(req.user.id, req.query);
    return success(res, result);
})

export const getCollection = wrapController(async (req, res) => {
    const item = await collectionService.getById(req.params.id, req.user.id);
    if (!item) return error(res, ERROR_CODE.NOT_FOUND, '合集不存在');
    return success(res, item);
})

export const createCollection = wrapController(async (req, res) => {
    const id = await collectionService.create({ ...req.body, user_id: req.user.id });
    return success(res, { id }, '创建成功');
})

export const updateCollection = wrapController(async (req, res) => {
    const ok = await collectionService.update(req.params.id, req.user.id, req.body);
    if (!ok) return error(res, ERROR_CODE.NOT_FOUND, '合集不存在');
    return success(res, null, '更新成功');
})

export const deleteCollection = wrapController(async (req, res) => {
    const ok = await collectionService.remove(req.params.id, req.user.id);
    if (!ok) return error(res, ERROR_CODE.NOT_FOUND, '合集不存在');
    return success(res, null, '删除成功');
})
