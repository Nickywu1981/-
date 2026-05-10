import digitalHumanDao from '../dao/digitalHumanDao.js';
import * as digitalHumanService from '../services/digital-human.service.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import logger from '../utils/logger.js';

export default {
  async create(req, res) {
    try {
      const job = await digitalHumanService.createDigitalHuman(req.userId, req.validated);
      return success(res, { job_id: job.id, status: 'queued' }, '数字人任务已提交');
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.status ? e.message : '操作失败');
    }
  },

  async getHistory(req, res) {
    try {
      const rows = await digitalHumanDao.findByUser(req.userId, {
        page: +req.query.page || 1,
        limit: +req.query.limit || 20,
      });
      return success(res, rows);
    } catch (err) {
      logger.error(err.message);
      return error(res, ERROR_CODE.INTERNAL_ERROR, '获取数字人历史失败');
    }
  },
};
