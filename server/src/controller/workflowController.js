/**
 * 工作流 — Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success, listResult } from '../utils/response.js';
import * as wfService from '../services/workflowService.js';
import logger from '../utils/logger.js';

export const listTemplates = wrapController(async (req, res) => {
  const { status } = req.query;
  const list = await wfService.listTemplates({ status });
  return success(res, list);
});

export const getTemplate = wrapController(async (req, res) => {
  const template = await wfService.getTemplate(Number(req.params.id));
  if (!template) return success(res, null, '模板不存在');
  return success(res, template);
});

export const createTemplate = wrapController(async (req, res) => {
  const { name, description, steps, status } = req.body;
  const id = await wfService.createTemplate({ name, description, steps, status, createdBy: req.user?.id });
  logger.info(`[Workflow] template created id=${id} name="${name}"`);
  return success(res, { id }, '模板创建成功');
});

export const updateTemplate = wrapController(async (req, res) => {
  const { name, description, steps, status } = req.body;
  const ok = await wfService.updateTemplate(Number(req.params.id), { name, description, steps, status });
  if (!ok) return success(res, null, '模板不存在');
  return success(res, null, '模板已更新');
});

export const deleteTemplate = wrapController(async (req, res) => {
  const ok = await wfService.deleteTemplate(Number(req.params.id));
  if (!ok) return success(res, null, '模板不存在');
  return success(res, null, '模板已删除');
});

export const execute = wrapController(async (req, res) => {
  const { templateId, inputData } = req.body;
  const jobId = await wfService.executeWorkflow(templateId, req.user?.id || 1, inputData || {});
  logger.info(`[Workflow] execute template=${templateId} job=${jobId}`);
  return success(res, { jobId }, '工作流已启动');
});

export const getJob = wrapController(async (req, res) => {
  const job = await wfService.getJob(Number(req.params.id));
  if (!job) return success(res, null, '作业不存在');
  return success(res, job);
});

export const listMyJobs = wrapController(async (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const result = await wfService.listJobs(req.user?.id || 1, { page: Number(page), pageSize: Number(pageSize) });
  return listResult(res, result.list, result.total, result.page, result.pageSize);
});

export const cancelJob = wrapController(async (req, res) => {
  await wfService.cancelJob(Number(req.params.id));
  return success(res, null, '作业已取消');
});
