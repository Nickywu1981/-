/**
 * 向量记忆控制器
 */
import { wrapController } from '../utils/wrapController.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as svc from '../services/memoryEmbedService.js';

export const embed = wrapController(async (req, res) => {
    const { text } = req.body;
    const result = svc.embed(text);
    return success(res, result, '文本向量化成功');
}

export const search = wrapController(async (req, res) => {
    const { query, topK } = req.body;
    const result = svc.semanticSearch(query, topK || 5);
    return success(res, result, `语义搜索完成 (${result.results.length}条)`);
}

export const status = wrapController(async (req, res) => {
    const status = svc.getMemoryStatus();
    return success(res, status, '向量记忆状态');
}
