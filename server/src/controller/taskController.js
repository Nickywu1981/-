import { wrapController } from '../utils/wrapController.js';
import * as taskService from '../services/taskService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const listMyWorks = wrapController(async (req, res) => {
    const data = await taskService.listMyWorks(req.user.id, req.query);
    return success(res, data);
}
