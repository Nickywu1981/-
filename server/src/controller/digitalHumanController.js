import * as digitalHumanDao from '../dao/digitalHumanDao.js';
import * as digitalHumanService from '../services/digital-human.service.js';
import { success } from '../utils/response.js';
import { wrapController } from '../utils/wrapController.js';

export const create = wrapController(async (req, res) => {
  const job = await digitalHumanService.createDigitalHuman(req.userId, req.validated);
  return success(res, { job_id: job.id, status: 'queued' }, '数字人任务已提交');
});

export const getHistory = wrapController(async (req, res) => {
  const rows = await digitalHumanDao.findByUser(req.userId, {
    page: +req.query.page || 1,
    limit: +req.query.limit || 20,
  });
  return success(res, rows);
});
