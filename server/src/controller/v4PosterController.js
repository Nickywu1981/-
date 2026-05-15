/**
 * Movio AI v4.1 — Poster Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import * as posterService from '../services/poster.service.js';
import * as promptEnhanceService from '../services/prompt-enhance.service.js';

export const generatePoster = wrapController(async (req, res) => {
  const job = await posterService.generatePoster(req.user.id, req.validated);
  return success(res, { job_id: job.id, status: 'queued' }, '海报任务已提交');
});

export const enhancePrompt = wrapController(async (req, res) => {
  const promptType = ['xhs', 'wechat'].includes(req.validated.posterType) ? 'social' : 'poster';
  const result = await promptEnhanceService.enhancePrompt(req.validated.prompt, promptType);
  return success(res, result);
});

export const getSizes = wrapController(async (_req, res) => {
  return success(res, {
    sizes: posterService.getPosterSizes(),
    styles: posterService.getPosterStyles(),
  });
});

export const getUserPosters = wrapController(async (req, res) => {
  const { type, page, limit } = req.query;
  const rows = await posterService.getUserPosters(req.user.id, { type, page, limit });
  return success(res, rows);
});
