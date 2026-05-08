import * as aiLogService from '../services/aiLogService.js';
import { success, listResult } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';

export async function listAiLogs(req, res, next) {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const { type, status } = req.query;
    const data = await aiLogService.listAiLogs({ page, pageSize, type, status });
    return listResult(res, data);
  } catch (err) { next(err); }
}

export async function getAiLogStats(req, res, next) {
  try {
    const data = await aiLogService.getStats();
    return success(res, data);
  } catch (err) { next(err); }
}
