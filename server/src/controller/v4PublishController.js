/**
 * Movio AI v4.1 — Publish Controller (多平台内容分发)
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import * as publishService from '../services/publishService.js';

export const getPublishPlatforms = wrapController(async (_req, res) => {
  return success(res, publishService.getPublishPlatforms());
});

export const submitPublish = wrapController(async (req, res) => {
  const { workId, platforms, title, description, tags, scheduleAt } = req.validated;
  const result = await publishService.submitPublish(
    req.user.id, workId, platforms,
    { title, description, tags, scheduleAt },
  );
  return success(res, result, '分发任务已提交');
});

export const getPublishBatch = wrapController(async (req, res) => {
  const result = await publishService.getPublishBatch(req.params.id, req.user.id);
  return success(res, result);
});

export const retryPublish = wrapController(async (req, res) => {
  const result = await publishService.retryPublish(req.params.id, req.user.id);
  return success(res, result, '已重新提交分发');
});

export const listPublishHistory = wrapController(async (req, res) => {
  const { page, pageSize, status, platform } = req.validated;
  const result = await publishService.listPublishHistory(req.user.id, { page, pageSize, status, platform });
  return success(res, result);
});

export const getPublishStats = wrapController(async (req, res) => {
  const result = await publishService.getPublishStats(req.user.id);
  return success(res, result);
});
