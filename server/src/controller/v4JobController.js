/**
 * Movio AI v4.1 — Job Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import * as jobQueueService from '../services/job-queue.service.js';

export const submitJob = wrapController(async (req, res) => {
  const { task_type, task_params } = req.validated;
  const result = await jobQueueService.submitJob(req.user.id, task_type, task_params || {});
  return success(res, result, '任务已提交');
});

export const getJobStatus = wrapController(async (req, res) => {
  const job = await jobQueueService.getJobStatus(req.params.id, req.user.id);
  return success(res, job);
});
