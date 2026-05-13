import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import * as advVideo from '../services/advancedVideoService.js';
import { success } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const submitScriptGen = wrapController(async (req, res) => {
    const { productInfo, scriptType, lang, length } = req.body;
    if (!productInfo) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advVideo.submitScriptGen(req.user.id, { productInfo, scriptType, lang, length });
    return success(res, data, '脚本生成任务已提交');
  });

export const submitShotPlan = wrapController(async (req, res) => {
    const { productInfo, videoStyle, totalDuration } = req.body;
    if (!productInfo) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advVideo.submitShotPlan(req.user.id, { productInfo, videoStyle, totalDuration });
    return success(res, data, '分镜生成任务已提交');
  });

export const submitViralClone = wrapController(async (req, res) => {
    const { referenceVideoUrl, productImageUrl, matchStrength } = req.body;
    if (!referenceVideoUrl || !productImageUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advVideo.submitViralClone(req.user.id, { referenceVideoUrl, productImageUrl, matchStrength });
    return success(res, data, '爆款复刻任务已提交');
  });

export const submitActionBatch = wrapController(async (req, res) => {
    const { actionVideoUrl, productImageUrls, targetAction } = req.body;
    if (!actionVideoUrl || !productImageUrls?.length) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advVideo.submitActionBatch(req.user.id, { actionVideoUrl, productImageUrls, targetAction });
    return success(res, data, `批量动作迁移已提交（${data.count}张）`);
  });

export const submitVideoBeautify = wrapController(async (req, res) => {
    const { videoUrl, options } = req.body;
    if (!videoUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advVideo.submitVideoBeautify(req.user.id, { videoUrl, options });
    return success(res, data, '视频美化任务已提交');
  });

export const submitVoiceGen = wrapController(async (req, res) => {
    const { text, voiceType, speed, lang } = req.body;
    if (!text) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advVideo.submitVoiceGen(req.user.id, { text, voiceType, speed, lang });
    return success(res, data, '语音生成任务已提交');
  });

export const submitVoiceClone = wrapController(async (req, res) => {
    const { audioSampleUrl, text, presetVoice } = req.body;
    if (!audioSampleUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advVideo.submitVoiceClone(req.user.id, { audioSampleUrl, text, presetVoice });
    return success(res, data, '声音克隆任务已提交');
  });

export const submitVideoEdit = wrapController(async (req, res) => {
    const data = await advVideo.submitVideoEdit(req.user.id, req.body);
    return success(res, data, '视频编辑任务已提交');
  });

export const submitViralAnalyze = wrapController(async (req, res) => {
    const { url } = req.body;
    if (!url) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advVideo.submitViralAnalyze(req.user.id, { url });
    return success(res, data, '爆款视频分析任务已提交');
  });

export const submitViralReplicate = wrapController(async (req, res) => {
    const { analysisResult, productImageUrl, productName } = req.body;
    if (!productImageUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
    const data = await advVideo.submitViralReplicate(req.user.id, { analysisResult, productImageUrl, productName });
    return success(res, data, '爆款复刻任务已提交');
  });

export const getTaskResult = wrapController(async (req, res) => {
    const data = await advVideo.getTaskResult(req.params.taskId, req.user.id);
    return success(res, data);
  });

export const listMyTasks = wrapController(async (req, res) => {
    const { status, type } = req.query;
    const { page, pageSize } = parsePagination(req.query);
    const data = await advVideo.listMyTasks(req.user.id, { status, type, page, pageSize });
    return success(res, data);
  });
