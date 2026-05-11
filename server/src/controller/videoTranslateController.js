import videoTranslateDao from '../dao/videoTranslateDao.js';
import * as translateService from '../services/video-translate.service.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import logger from '../utils/logger.js';

export default {
  async submitVoice(req, res) {
    try {
      const job = await translateService.translateVoice(req.userId, req.validated);
      return success(res, { job_id: job.id, status: 'queued' }, '语音翻译任务已提交');
    } catch (e) {
      const code = e.status === 400 ? 400 : ERROR_CODE.INTERNAL_ERROR;
      const msg = e.status === 400 ? e.message : '操作失败';
      logger.error('[videoTranslate] submitVoice:', e.message || e);
      return error(res, code, msg);
    }
  },

  async submitSubtitles(req, res) {
    try {
      const job = await translateService.translateSubtitles(req.userId, req.validated);
      return success(res, { job_id: job.id, status: 'queued' }, '字幕翻译任务已提交');
    } catch (e) {
      const code = e.status === 400 ? 400 : ERROR_CODE.INTERNAL_ERROR;
      const msg = e.status === 400 ? e.message : '操作失败';
      logger.error('[videoTranslate] submitSubtitles:', e.message || e);
      return error(res, code, msg);
    }
  },

  async submitFace(req, res) {
    try {
      const job = await translateService.translateFace(req.userId, req.validated);
      return success(res, { job_id: job.id, status: 'queued' }, '面容翻译任务已提交');
    } catch (e) {
      const code = e.status === 400 ? 400 : ERROR_CODE.INTERNAL_ERROR;
      const msg = e.status === 400 ? e.message : '操作失败';
      logger.error('[videoTranslate] submitFace:', e.message || e);
      return error(res, code, msg);
    }
  },

  async getLangs(_req, res) {
    return success(res, { langs: translateService.SUPPORTED_LANGS });
  },

  async getHistory(req, res) {
    try {
      const { type, page, limit } = req.query;
      const rows = await videoTranslateDao.findByUser(req.userId, {
        taskType: type || null,
        page: +page || 1,
        limit: +limit || 20,
      });
      return success(res, rows);
    } catch (err) {
      logger.error(err.message);
      return error(res, ERROR_CODE.INTERNAL_ERROR, '获取翻译历史失败');
    }
  },
};
