import * as taskService from '../services/taskService.js';
import { success, error } from '../utils/response.js';

export async function listMyWorks(req, res) {
  try {
    const data = await taskService.listMyWorks(req.user.id, req.query);
    return success(res, data);
  } catch (err) {
    return error(res, err.status || 500, err.message);
  }
}
