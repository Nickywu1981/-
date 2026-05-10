import { wrapController } from '../utils/wrapController.js';
import * as advVideo from '../services/advancedVideoService.js';
import { success, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const submitScriptGen = wrapController(async (req, res, next) => {
    const { productInfo, scriptType, lang, length } = req.body;
    if (!productInfo) return error(res, ERROR_CODE.PARAM_MISSING, '请输入产品卖点信息');
    const data = await advVideo.submitScriptGen(req.user.id, { productInfo, scriptType, lang, length });
    return success(res, data, '脚本生成任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export const submitShotPlan = wrapController(async (req, res, next) => {
    const { productInfo, videoStyle, totalDuration } = req.body;
    if (!productInfo) return error(res, ERROR_CODE.PARAM_MISSING, '请输入产品信息');
    const data = await advVideo.submitShotPlan(req.user.id, { productInfo, videoStyle, totalDuration });
    return success(res, data, '分镜生成任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export const submitViralClone = wrapController(async (req, res, next) => {
    const { referenceVideoUrl, productImageUrl, matchStrength } = req.body;
    if (!referenceVideoUrl || !productImageUrl) return error(res, ERROR_CODE.PARAM_MISSING, '请上传爆款视频和产品图');
    const data = await advVideo.submitViralClone(req.user.id, { referenceVideoUrl, productImageUrl, matchStrength });
    return success(res, data, '爆款复刻任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export const submitActionBatch = wrapController(async (req, res, next) => {
    const { actionVideoUrl, productImageUrls, targetAction } = req.body;
    if (!actionVideoUrl || !productImageUrls?.length) return error(res, ERROR_CODE.PARAM_MISSING, '请上传动作视频和至少一张产品图');
    const data = await advVideo.submitActionBatch(req.user.id, { actionVideoUrl, productImageUrls, targetAction });
    return success(res, data, `批量动作迁移已提交（${data.count}张）`);
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export const submitVideoBeautify = wrapController(async (req, res, next) => {
    const { videoUrl, options } = req.body;
    if (!videoUrl) return error(res, ERROR_CODE.PARAM_MISSING, '请提供视频地址');
    const data = await advVideo.submitVideoBeautify(req.user.id, { videoUrl, options });
    return success(res, data, '视频美化任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export const submitVoiceGen = wrapController(async (req, res, next) => {
    const { text, voiceType, speed, lang } = req.body;
    if (!text) return error(res, ERROR_CODE.PARAM_MISSING, '请输入配音文案');
    const data = await advVideo.submitVoiceGen(req.user.id, { text, voiceType, speed, lang });
    return success(res, data, '语音生成任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export const submitVoiceClone = wrapController(async (req, res, next) => {
    const { audioSampleUrl, text, presetVoice } = req.body;
    if (!audioSampleUrl) return error(res, ERROR_CODE.PARAM_MISSING, '请上传音频样本');
    const data = await advVideo.submitVoiceClone(req.user.id, { audioSampleUrl, text, presetVoice });
    return success(res, data, '声音克隆任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export const submitVideoEdit = wrapController(async (req, res, next) => {
    const data = await advVideo.submitVideoEdit(req.user.id, req.body);
    return success(res, data, '视频编辑任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export const submitViralAnalyze = wrapController(async (req, res, next) => {
    const { url } = req.body;
    if (!url) return error(res, ERROR_CODE.PARAM_MISSING, '请输入爆款视频链接');
    const data = await advVideo.submitViralAnalyze(req.user.id, { url });
    return success(res, data, '爆款视频分析任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export const submitViralReplicate = wrapController(async (req, res, next) => {
    const { analysisResult, productImageUrl, productName } = req.body;
    if (!productImageUrl) return error(res, ERROR_CODE.PARAM_MISSING, '请上传产品图');
    const data = await advVideo.submitViralReplicate(req.user.id, { analysisResult, productImageUrl, productName });
    return success(res, data, '爆款复刻任务已提交');
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export const getTaskResult = wrapController(async (req, res, next) => {
    const data = await advVideo.getTaskResult(req.params.taskId, req.user.id);
    return success(res, data);
  } catch (err) {
    if (err.status) return error(res, err.status, err.message);
    next(err);
  }
}

export const listMyTasks = wrapController(async (req, res, next) => {
    const { status, type } = req.query;
    const { page, pageSize } = parsePagination(req.query);
    const data = await advVideo.listMyTasks(req.user.id, { status, type, page, pageSize });
    return success(res, data);
  } catch (err) {
    next(err);
  }
}
