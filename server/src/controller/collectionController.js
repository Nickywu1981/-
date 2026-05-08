import * as collectionService from '../services/collectionService.js';
import { success, error } from '../utils/response.js';

export async function listCollections(req, res) {
  const result = await collectionService.listByUser(req.user.id, req.query);
  success(res, result);
}

export async function getCollection(req, res) {
  const item = await collectionService.getById(req.params.id);
  if (!item) return error(res, 404, '合集不存在');
  success(res, item);
}

export async function createCollection(req, res) {
  const id = await collectionService.create({ ...req.body, user_id: req.user.id });
  success(res, { id }, '创建成功');
}

export async function updateCollection(req, res) {
  await collectionService.update(req.params.id, req.body);
  success(res, null, '更新成功');
}

export async function deleteCollection(req, res) {
  await collectionService.remove(req.params.id);
  success(res, null, '删除成功');
}
