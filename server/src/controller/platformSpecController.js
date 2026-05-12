import { wrapController } from '../utils/wrapController.js';
import svc from '../services/platformSpecService.js';
import { success } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { BusinessError } from '../utils/businessError.js';

export const listPlatforms = wrapController(async (req, res) => {
    const data = await svc.listAll(req);
    return success(res, data);
  });

export const getSpec = wrapController(async (req, res) => {
    const data = await svc.getById(req.params.id, req);
    if (!data) throw new BusinessError(ERROR_CODE.NOT_FOUND, '规格不存在');
    return success(res, data);
  });

export const getSpecsByPlatform = wrapController(async (req, res) => {
    const data = await svc.getByPlatformCode(req.params.code, req);
    return success(res, data);
  });

export const createSpec = wrapController(async (req, res) => {
    const id = await svc.create(req.body, req);
    return success(res, { id }, '创建成功');
  });

export const updateSpec = wrapController(async (req, res) => {
    const ok = await svc.update(req.params.id, req.body, req);
    if (!ok) throw new BusinessError(ERROR_CODE.NOT_FOUND, '规格不存在');
    return success(res, null, '更新成功');
  });

export const deleteSpec = wrapController(async (req, res) => {
    const ok = await svc.remove(req.params.id, req);
    if (!ok) throw new BusinessError(ERROR_CODE.NOT_FOUND, '规格不存在');
    return success(res, null, '删除成功');
  });

export const adaptImage = wrapController(async (req, res) => {
    const { inputPath, platformCode, outputDir } = req.body;
    const result = await svc.adaptImage(inputPath, platformCode, outputDir || './uploads/adapted');
    return success(res, result, '图片适配成功');
  });
