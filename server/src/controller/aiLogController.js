import { wrapController } from '../utils/wrapController.js';
import * as aiLogService from '../services/aiLogService.js';
import { success, listResult } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';

export const listAiLogs = wrapController(async (req, res, next) => {
    const { page, pageSize } = parsePagination(req.query);
    const { type, status } = req.query;
    const data = await aiLogService.listAiLogs({ page, pageSize, type, status });
    return listResult(res, data);
  });

export const getAiLogStats = wrapController(async (req, res, next) => {
    const data = await aiLogService.getStats();
    return success(res, data);
  });
