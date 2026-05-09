import svc from '../services/platformSpecService.js';
import { success, error } from '../utils/response.js';

export async function listPlatforms(req, res) {
  const data = await svc.listAll(req);
  return success(res, data);
}

export async function getSpec(req, res) {
  const data = await svc.getById(req.params.id, req);
  if (!data) return error(res, 404, '规格不存在');
  return success(res, data);
}

export async function getSpecsByPlatform(req, res) {
  const data = await svc.getByPlatformCode(req.params.code, req);
  return success(res, data);
}

export async function createSpec(req, res) {
  const id = await svc.create(req.body, req);
  return success(res, { id }, '创建成功');
}

export async function updateSpec(req, res) {
  const ok = await svc.update(req.params.id, req.body, req);
  if (!ok) return error(res, 404, '规格不存在');
  return success(res, null, '更新成功');
}

export async function deleteSpec(req, res) {
  const ok = await svc.remove(req.params.id, req);
  if (!ok) return error(res, 404, '规格不存在');
  return success(res, null, '删除成功');
}

export async function adaptImage(req, res) {
  try {
    const { inputPath, platformCode, outputDir } = req.body;
    const result = await svc.adaptImage(inputPath, platformCode, outputDir || './uploads/adapted');
    return success(res, result, '图片适配成功');
  } catch (e) {
    const status = e.status || 500;
    return error(res, status, e.message);
  }
}

export default { listPlatforms, getSpec, getSpecsByPlatform, createSpec, updateSpec, deleteSpec, adaptImage };
