import svc from '../services/platformSpecService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import logger from '../utils/logger.js';

function handle(next, fn) {
  return async (req, res) => { try { return await fn(req, res); } catch (e) { logger.error('platformSpec', e); next(e); } };
}

export function listPlatforms(req, res, next) { return handle(next, async () => { const data = await svc.listAll(req); return success(res, data); })(req, res); }

export function getSpec(req, res, next) {
  return handle(next, async () => {
    const data = await svc.getById(req.params.id, req);
    if (!data) return error(res, ERROR_CODE.NOT_FOUND, '规格不存在');
    return success(res, data);
  })(req, res);
}

export function getSpecsByPlatform(req, res, next) { return handle(next, async () => { const data = await svc.getByPlatformCode(req.params.code, req); return success(res, data); })(req, res); }

export function createSpec(req, res, next) { return handle(next, async () => { const id = await svc.create(req.body, req); return success(res, { id }, '创建成功'); })(req, res); }

export function updateSpec(req, res, next) {
  return handle(next, async () => {
    const ok = await svc.update(req.params.id, req.body, req);
    if (!ok) return error(res, ERROR_CODE.NOT_FOUND, '规格不存在');
    return success(res, null, '更新成功');
  })(req, res);
}

export function deleteSpec(req, res, next) {
  return handle(next, async () => {
    const ok = await svc.remove(req.params.id, req);
    if (!ok) return error(res, ERROR_CODE.NOT_FOUND, '规格不存在');
    return success(res, null, '删除成功');
  })(req, res);
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
