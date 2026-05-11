import { wrapController } from '../utils/wrapController.js';
import * as taskService from '../services/taskService.js';
import { success } from '../utils/response.js';

export const listMyWorks = wrapController(async (req, res) => {
    const data = await taskService.listMyWorks(req.user.id, req.query);
    return success(res, data);
})
