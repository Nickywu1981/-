import * as advService from '../services/advancedImageService.js';
import { success, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export async function submitVirtualTryon(req, res, next) {
  try {
    const { productImageUrl, skinTone, bodyType, style } = req.body;
    if (!productImageUrl) return error(res, ERROR_CODE.PARAM_MISSING, '请上传服装图');
    const data = await advService.submitVirtualTryon(req.user.id, { productImageUrl, skinTone, bodyType, style });
    return success(res, data, '虚拟模特任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export async function submitColorSwap(req, res, next) {
  try {
    const { productImageUrl, targetColors, preserveTexture } = req.body;
    if (!productImageUrl) return error(res, ERROR_CODE.PARAM_MISSING, '请上传产品图');
    const data = await advService.submitColorSwap(req.user.id, { productImageUrl, targetColors, preserveTexture });
    return success(res, data, '换色任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export async function submitStyleTransfer(req, res, next) {
  try {
    const { productImageUrl, targetStyle, strength } = req.body;
    if (!productImageUrl || !targetStyle) return error(res, ERROR_CODE.PARAM_MISSING, '请上传产品图并选择目标风格');
    const data = await advService.submitStyleTransfer(req.user.id, { productImageUrl, targetStyle, strength });
    return success(res, data, '风格转化任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export async function submitWrinkleRemove(req, res, next) {
  try {
    const { productImageUrl, fabricType } = req.body;
    if (!productImageUrl) return error(res, ERROR_CODE.PARAM_MISSING, '请上传服装图');
    const data = await advService.submitWrinkleRemove(req.user.id, { productImageUrl, fabricType });
    return success(res, data, '去褶皱任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export async function submitImageTranslate(req, res, next) {
  try {
    const { productImageUrl, sourceLang, targetLang } = req.body;
    if (!productImageUrl) return error(res, ERROR_CODE.PARAM_MISSING, '请上传包含文字的图片');
    if (!targetLang) return error(res, ERROR_CODE.PARAM_MISSING, '请选择目标语言');
    const data = await advService.submitImageTranslate(req.user.id, { productImageUrl, sourceLang, targetLang });
    return success(res, data, '图片翻译任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export async function submitOutpainting(req, res, next) {
  try {
    const { productImageUrl, direction, ratio } = req.body;
    if (!productImageUrl) return error(res, ERROR_CODE.PARAM_MISSING, '请上传需要扩图的图片');
    const data = await advService.submitOutpainting(req.user.id, { productImageUrl, direction, ratio });
    return success(res, data, '扩图任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export async function submitGhostMannequin(req, res, next) {
  try {
    const { productImageUrl, effect, category } = req.body;
    if (!productImageUrl) return error(res, ERROR_CODE.PARAM_MISSING, '请上传假模服装图');
    const data = await advService.submitGhostMannequin(req.user.id, { productImageUrl, effect, category });
    return success(res, data, '幽灵模特任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export async function getTaskResult(req, res, next) {
  try {
    const data = await advService.getTaskResult(req.params.taskId, req.user.id);
    return success(res, data);
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export async function listMyTasks(req, res, next) {
  try {
    const { status, type } = req.query;
    const { page, pageSize } = parsePagination(req.query);
    const data = await advService.listMyTasks(req.user.id, { status, type, page, pageSize });
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

// 模特生成 / 全景拍摄 / 换脸 / 文字特效
export async function submitModelGenerate(req, res, next) {
  try {
    const { imageUrl, modelType } = req.body;
    if (!imageUrl) return error(res, ERROR_CODE.PARAM_MISSING, '请上传商品图片');
    const data = await advService.submitModelGenerate(req.user.id, { imageUrl, modelType });
    return success(res, data, '模特生成任务已提交');
  } catch (err) { if (err.status) return error(res, err.status, err.message); next(err); }
}

export async function submitShotPanorama(req, res, next) {
  try {
    const { imageUrl, mode } = req.body;
    if (!imageUrl) return error(res, ERROR_CODE.PARAM_MISSING, '请上传商品图片');
    const data = await advService.submitShotPanorama(req.user.id, { imageUrl, mode });
    return success(res, data, '全景拍摄任务已提交');
  } catch (err) { if (err.status) return error(res, err.status, err.message); next(err); }
}

export async function submitSwapFace(req, res, next) {
  try {
    const { baseUrl, faceUrl } = req.body;
    if (!baseUrl || !faceUrl) return error(res, ERROR_CODE.PARAM_MISSING, '请上传底图和面部图片');
    const data = await advService.submitSwapFace(req.user.id, { baseUrl, faceUrl });
    return success(res, data, 'AI换脸任务已提交');
  } catch (err) { if (err.status) return error(res, err.status, err.message); next(err); }
}

export async function submitTextEffect(req, res, next) {
  try {
    const { text, effect } = req.body;
    if (!text) return error(res, ERROR_CODE.PARAM_MISSING, '请输入文字内容');
    const data = await advService.submitTextEffect(req.user.id, { text, effect });
    return success(res, data, '文字特效任务已提交');
  } catch (err) { if (err.status) return error(res, err.status, err.message); next(err); }
}
