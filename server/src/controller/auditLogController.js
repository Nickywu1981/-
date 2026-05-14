/**
 * Audit Log Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { listResult } from '../utils/response.js';
import * as auditLogDao from '../dao/auditLogDao.js';
import { parsePagination } from '../utils/pagination.js';

export const list = wrapController(async (req, res) => {
  const { page, pageSize } = parsePagination(req.query);
  const result = await auditLogDao.list({ ...req.query, page, pageSize });
  return listResult(res, result);
});
