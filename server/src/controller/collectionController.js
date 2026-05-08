import * as collectionService from '../services/collectionService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export async function listCollections(req, res) {
  try {
    const result = await collectionService.listByUser(req.user.id, req.query);
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
}

export async function getCollection(req, res) {
  try {
    const item = await collectionService.getById(req.params.id);
    if (!item) return error(res, ERROR_CODE.NOT_FOUND, '合集不存在');
    return success(res, item);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
}

export async function createCollection(req, res) {
  try {
    const id = await collectionService.create({ ...req.body, user_id: req.user.id });
    return success(res, { id }, '创建成功');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
}

export async function updateCollection(req, res) {
  try {
    await collectionService.update(req.params.id, req.body);
    return success(res, null, '更新成功');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
}

export async function deleteCollection(req, res) {
  try {
    await collectionService.remove(req.params.id);
    return success(res, null, '删除成功');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
}
