/**
 * Movio AI v4.1 — Cut Ecosystem Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import * as cutEcosystemService from '../services/cutEcosystemService.js';

export const exportJianying = wrapController(async (req, res) => {
  const result = await cutEcosystemService.exportJianyingDraft(req.user.id, req.validated);
  return success(res, result);
});

export const exportCapcut = wrapController(async (req, res) => {
  const result = await cutEcosystemService.exportCapCutDraft(req.user.id, req.validated);
  return success(res, result);
});

export const getRatios = wrapController(async (_req, res) => {
  return success(res, cutEcosystemService.getPlatformRatios());
});

export const getExportableWorks = wrapController(async (req, res) => {
  const result = await cutEcosystemService.getUserExportableWorks(req.user.id, req.validated);
  return success(res, result);
});
