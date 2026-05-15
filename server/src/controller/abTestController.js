/**
 * A/B 实验控制器
 */
import * as abTestService from '../services/abTestService.js';
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';

export const listExperiments = wrapController(async (req) => {
  const { status } = req.query;
  return success(req.res, await abTestService.listExperiments(status || undefined));
});

export const getExperiment = wrapController(async (req) => {
  return success(req.res, await abTestService.getExperiment(parseInt(req.params.id)));
});

export const createExperiment = wrapController(async (req) => {
  const data = { ...req.body, createdBy: req.user?.id };
  return success(req.res, await abTestService.createExperiment(data));
});

export const updateExperiment = wrapController(async (req) => {
  return success(req.res, await abTestService.updateExperiment(parseInt(req.params.id), req.body));
});

export const deleteExperiment = wrapController(async (req) => {
  return success(req.res, await abTestService.deleteExperiment(parseInt(req.params.id)));
});

export const startExperiment = wrapController(async (req) => {
  return success(req.res, await abTestService.startExperiment(parseInt(req.params.id)));
});

export const pauseExperiment = wrapController(async (req) => {
  return success(req.res, await abTestService.pauseExperiment(parseInt(req.params.id)));
});

export const completeExperiment = wrapController(async (req) => {
  return success(req.res, await abTestService.completeExperiment(parseInt(req.params.id)));
});

export const getResults = wrapController(async (req) => {
  const days = parseInt(req.query.days) || 7;
  return success(req.res, await abTestService.getExperimentResults(parseInt(req.params.id), days));
});
