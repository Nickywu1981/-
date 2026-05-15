/**
 * Movio AI v4.1 — Video Translate Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import * as translateService from '../services/video-translate.service.js';

export const translateVoice = wrapController(async (req, res) => {
  const job = await translateService.translateVoice(req.user.id, req.validated);
  return success(res, { job_id: job.id, status: 'queued' }, '语音翻译任务已提交');
});

export const translateSubtitles = wrapController(async (req, res) => {
  const job = await translateService.translateSubtitles(req.user.id, req.validated);
  return success(res, { job_id: job.id, status: 'queued' }, '字幕翻译任务已提交');
});

export const translateFace = wrapController(async (req, res) => {
  const job = await translateService.translateFace(req.user.id, req.validated);
  return success(res, { job_id: job.id, status: 'queued' }, '面容翻译任务已提交');
});

export const getSupportedLangs = wrapController(async (_req, res) => {
  return success(res, { langs: translateService.SUPPORTED_LANGS });
});

export const getUserTranslateHistory = wrapController(async (req, res) => {
  const { type, page, limit } = req.query;
  const rows = await translateService.getUserTranslateHistory(req.user.id, { type, page, limit });
  return success(res, rows);
});
