/**
 * Movio AI v4.1 — Job Queue Service
 * G6 Backend-B | 2026-05-14
 *
 * 异步任务队列业务逻辑层 — 所有 SQL 已下沉至 jobQueueDao。
 */
import { BusinessError } from '../utils/businessError.js';
import logger from '../utils/logger.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as jobDao from '../dao/jobQueueDao.js';

export async function submitJob(userId, taskType, taskParams, options = {}) {
  const jobId = await jobDao.insertJob(userId, taskType, taskParams, options);
  return { job_id: jobId, status: 'queued' };
}

export async function getJobStatus(jobId, userId) {
  const job = await jobDao.findJobById(jobId, userId);
  if (!job) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return job;
}

export async function getUserJobs(userId, opts) {
  return jobDao.findUserJobs(userId, opts);
}

export async function fetchPending(limit) {
  return jobDao.fetchPendingTasks(limit);
}

export async function updateProgress(jobId, progress) {
  await jobDao.updateProgress(jobId, progress);
}

export async function completeJob(jobId, resultData) {
  const affected = await jobDao.completeJob(jobId, resultData);
  if (affected === 0) {
    logger.warn(`[JobQueue] completeJob #${jobId} 状态已变更，跳过覆盖`);
  }
}

export async function cancelJob(jobId, userId) {
  const result = await jobDao.cancelJobWithLock(jobId, userId);
  if (!result) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  if (!result.cancellable) {
    throw new BusinessError(ERROR_CODE.PARAM_ERROR, `Status ${result.status} cannot be cancelled`);
  }
  return { job_id: jobId, status: 'cancelled' };
}

export async function retryJob(jobId, userId) {
  const job = await jobDao.findJobByIdOnly(jobId);
  if (!job) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  if (!['failed', 'cancelled'].includes(job.status)) {
    throw new BusinessError(ERROR_CODE.PARAM_ERROR, `Status ${job.status} cannot be retried`);
  }
  await jobDao.retryJobById(jobId);
  return { job_id: jobId, status: 'queued' };
}

export async function failJob(jobId, errorMessage) {
  const affected = await jobDao.failJob(jobId, errorMessage);
  if (affected === 0) {
    logger.warn(`[JobQueue] failJob #${jobId} 非 processing 状态，跳过`);
  }
}

export async function recoverStuckJobs(timeoutMinutes) {
  return jobDao.recoverStuckJobs(timeoutMinutes);
}

export async function updateJobPriority(jobId, priority) {
  await jobDao.updatePriority(jobId, priority);
  return true;
}

export async function listJobs(userId, { status, page = 1, limit = 20 } = {}) {
  return getUserJobs(userId, { status, page, pageSize: limit });
}

export async function getJob(jobId) {
  return jobDao.findJobByIdOnly(jobId);
}

export async function getQueueStats() {
  return jobDao.getQueueStats();
}
