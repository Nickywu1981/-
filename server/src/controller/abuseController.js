import { wrapController } from '../utils/wrapController.js';
import abuseService from '../services/abuseService.js';
import { parsePagination } from '../utils/pagination.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const listAllRecords = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query);
    const { userId } = req.query;
    const data = await abuseService.listAbuseRecords({ page, pageSize, userId });
    success(res, data);
})

export const checkAbuse = wrapController(async (req, res) => {
    const { userId } = req.params;
    const isAbusing = await abuseService.checkHighFrequency(+userId);
    success(res, { abusing: isAbusing });
})

export default { listAllRecords, checkAbuse };
