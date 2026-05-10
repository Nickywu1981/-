import { wrapController } from '../utils/wrapController.js';
import * as videoService from '../services/videoService.js';
import { cancelJob, retryJob } from '../services/job-queue.service.js';
import { success, error, listResult } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { parsePagination } from '../utils/pagination.js';

export const submitImg2Video = wrapController(async (req, res, next) => {
    const { imageUrl, style, duration, platform } = req.body;
    if (!imageUrl) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请上传产品图');
    }
    const data = await videoService.submitImg2Video(req.user.id, { imageUrl, style, duration, platform });
    return success(res, data, '视频任务已提交');
  })

export const submitMulti2Video = wrapController(async (req, res, next) => {
    const { imageUrls, style, duration, sellPoints } = req.body;
    if (!imageUrls || imageUrls.length < 2) {
      return error(res, ERROR_CODE.PARAM_MISSING, '至少需要2张图片');
    }
    const data = await videoService.submitMulti2Video(req.user.id, { imageUrls, style, duration, sellPoints });
    return success(res, data, '多图合成任务已提交');
  })

export const submitVideoPackaging = wrapController(async (req, res, next) => {
    const { videoUrl, options } = req.body;
    if (!videoUrl) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请提供视频地址');
    }
    const data = await videoService.submitVideoPackaging(req.user.id, { videoUrl, options });
    return success(res, data, '包装任务已提交');
  })

export const submitActionTransfer = wrapController(async (req, res, next) => {
    const { sourceImageUrl, actionVideoUrl, targetAction } = req.body;
    if (!sourceImageUrl || !actionVideoUrl) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请上传源图片和动作视频');
    }
    const data = await videoService.submitActionTransfer(req.user.id, { sourceImageUrl, actionVideoUrl, targetAction });
    return success(res, data, '动作迁移任务已提交');
  })

export const submitPersonReplace = wrapController(async (req, res, next) => {
    const { sourceImageUrl, targetPersonUrl } = req.body;
    if (!sourceImageUrl || !targetPersonUrl) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请上传商品图和目标人物图');
    }
    const data = await videoService.submitPersonReplace(req.user.id, { sourceImageUrl, targetPersonUrl });
    return success(res, data, '人物替换任务已提交');
  })

export const submitDigitalHuman = wrapController(async (req, res, next) => {
    const { script, voice, avatar, background } = req.body;
    if (!script) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请输入口播文案');
    }
    const data = await videoService.submitDigitalHuman(req.user.id, { script, voice, avatar, background });
    return success(res, data, '口播生成任务已提交');
  })

export const getVideoTaskResult = wrapController(async (req, res, next) => {
    const data = await videoService.getTaskResult(req.params.taskId, req.user.id);
    return success(res, data);
  })

export const listMyVideoTasks = wrapController(async (req, res, next) => {
    const { status, type } = req.query;
    const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
    const data = await videoService.listMyTasks(req.user.id, { status, type, page, pageSize });
    return listResult(res, data);
  })

export const cancelVideoTask = wrapController(async (req, res, next) => {
    const data = await cancelJob(req.params.taskId, req.user.id);
    return success(res, data, '任务已取消');
  })

export const retryVideoTask = wrapController(async (req, res, next) => {
    const data = await retryJob(req.params.taskId, req.user.id);
    return success(res, data, '任务已重新排队');
  })
