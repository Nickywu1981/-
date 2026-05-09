/**
 * 向量记忆控制器
 */
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as svc from '../services/memoryEmbedService.js';

export async function embed(req, res) {
  try {
    const { text } = req.body;
    const result = svc.embed(text);
    return success(res, result, '文本向量化成功');
  } catch (e) {
    return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
  }
}

export async function search(req, res) {
  try {
    const { query, topK } = req.body;
    const result = svc.semanticSearch(query, topK || 5);
    return success(res, result, `语义搜索完成 (${result.results.length}条)`);
  } catch (e) {
    return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
  }
}

export async function status(req, res) {
  try {
    const status = svc.getMemoryStatus();
    return success(res, status, '向量记忆状态');
  } catch (e) {
    return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
  }
}
