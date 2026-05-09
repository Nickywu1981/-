import * as taskService from '../services/taskService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export async function listMyWorks(req, res) {
  try {
    const data = await taskService.listMyWorks(req.user.id, req.query);
    return success(res, data);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
}
