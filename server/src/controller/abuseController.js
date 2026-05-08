import abuseService from '../services/abuseService.js';
import { parsePagination } from '../utils/pagination.js';
import { success } from '../utils/response.js';

export async function listAllRecords(req, res) {
  const { page, pageSize } = parsePagination(req.query);
  const { userId } = req.query;
  const data = await abuseService.listAbuseRecords({ page, pageSize, userId });
  success(res, data);
}

export async function checkAbuse(req, res) {
  const { userId } = req.params;
  const isAbusing = await abuseService.checkHighFrequency(+userId);
  success(res, { abusing: isAbusing });
}

export default { listAllRecords, checkAbuse };
