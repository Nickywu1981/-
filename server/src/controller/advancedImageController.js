import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import * as advService from '../services/advancedImageService.js';
import { success } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const submitVirtualTryon = wrapController(async (req, res) => {
    const { productImageUrl, skinTone, bodyType, style } = req.body;
    if (!productImageUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advService.submitVirtualTryon(req.user.id, { productImageUrl, skinTone, bodyType, style });
    return success(res, data, '虚拟模特任务已提交');
  });

export const submitColorSwap = wrapController(async (req, res) => {
    const { productImageUrl, targetColors, preserveTexture } = req.body;
    if (!productImageUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advService.submitColorSwap(req.user.id, { productImageUrl, targetColors, preserveTexture });
    return success(res, data, '换色任务已提交');
  });

export const submitStyleTransfer = wrapController(async (req, res) => {
    const { productImageUrl, targetStyle, strength } = req.body;
    if (!productImageUrl || !targetStyle) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advService.submitStyleTransfer(req.user.id, { productImageUrl, targetStyle, strength });
    return success(res, data, '风格转化任务已提交');
  });

export const submitWrinkleRemove = wrapController(async (req, res) => {
    const { productImageUrl, fabricType } = req.body;
    if (!productImageUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advService.submitWrinkleRemove(req.user.id, { productImageUrl, fabricType });
    return success(res, data, '去褶皱任务已提交');
  });

export const submitImageTranslate = wrapController(async (req, res) => {
    const { productImageUrl, sourceLang, targetLang } = req.body;
    if (!productImageUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    if (!targetLang) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advService.submitImageTranslate(req.user.id, { productImageUrl, sourceLang, targetLang });
    return success(res, data, '图片翻译任务已提交');
  });

export const submitOutpainting = wrapController(async (req, res) => {
    const { productImageUrl, direction, ratio } = req.body;
    if (!productImageUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advService.submitOutpainting(req.user.id, { productImageUrl, direction, ratio });
    return success(res, data, '扩图任务已提交');
  });

export const submitGhostMannequin = wrapController(async (req, res) => {
    const { productImageUrl, effect, category } = req.body;
    if (!productImageUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advService.submitGhostMannequin(req.user.id, { productImageUrl, effect, category });
    return success(res, data, '幽灵模特任务已提交');
  });

export const getTaskResult = wrapController(async (req, res) => {
    const data = await advService.getTaskResult(req.params.taskId, req.user.id);
    return success(res, data);
  });

export const listMyTasks = wrapController(async (req, res) => {
    const { status, type } = req.query;
    const { page, pageSize } = parsePagination(req.query);
    const data = await advService.listMyTasks(req.user.id, { status, type, page, pageSize });
    return success(res, data);
  });

// 模特生成 / 全景拍摄 / 换脸 / 文字特效
export const submitModelGenerate = wrapController(async (req, res) => {
    const { imageUrl, modelType } = req.body;
    if (!imageUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advService.submitModelGenerate(req.user.id, { imageUrl, modelType });
    return success(res, data, '模特生成任务已提交');
  });

export const submitShotPanorama = wrapController(async (req, res) => {
    const { imageUrl, mode } = req.body;
    if (!imageUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advService.submitShotPanorama(req.user.id, { imageUrl, mode });
    return success(res, data, '全景拍摄任务已提交');
  });

export const submitSwapFace = wrapController(async (req, res) => {
    const { baseUrl, faceUrl } = req.body;
    if (!baseUrl || !faceUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advService.submitSwapFace(req.user.id, { baseUrl, faceUrl });
    return success(res, data, 'AI换脸任务已提交');
  });

export const submitTextEffect = wrapController(async (req, res) => {
    const { text, effect } = req.body;
    if (!text) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advService.submitTextEffect(req.user.id, { text, effect });
    return success(res, data, '文字特效任务已提交');
  });
