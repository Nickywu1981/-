import abuseService from '../services/abuseService.js';
import { parsePagination } from '../utils/pagination.js';
import { success, error } from '../utils/response.js';

export async function listAllRecords(req, res) {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const { userId } = req.query;
    const data = await abuseService.listAbuseRecords({ page, pageSize, userId });
    success(res, data);
  } catch (err) { error(res, err.status || 500, err.message); }
}

export async function checkAbuse(req, res) {
  try {
    const { userId } = req.params;
    const isAbusing = await abuseService.checkHighFrequency(+userId);
    success(res, { abusing: isAbusing });
  } catch (err) { error(res, err.status || 500, err.message); }
}

export default { listAllRecords, checkAbuse };
