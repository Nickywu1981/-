import { wrapController } from '../utils/wrapController.js';
import * as copywritingService from '../services/copywritingService.js';
import { success, error, listResult } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// 商品标题生成
export const generateTitles = wrapController(async (req, res) => {
    const result = await copywritingService.generateTitles(req.user.id, req.body);
    success(res, result, '标题生成成功');
}

// 卖点文案生成
export const generateDescription = wrapController(async (req, res) => {
    const result = await copywritingService.generateDescription(req.user.id, req.body);
    success(res, result, '卖点文案生成成功');
}

// 跨境多语言翻译
export const translateProduct = wrapController(async (req, res) => {
    const result = await copywritingService.translateProduct(req.user.id, req.body);
    success(res, result, '翻译成功');
}

// 短视频脚本生成
export const generateScript = wrapController(async (req, res) => {
    const result = await copywritingService.generateScript(req.user.id, req.body);
    success(res, result, '脚本生成成功');
}

// 平台列表
export const listPlatforms = wrapController(async (_req, res) => {
    success(res, copywritingService.getPlatforms());
}

// 语言列表
export const listLanguages = wrapController(async (_req, res) => {
    success(res, copywritingService.getLanguages());
}

// 生成历史
export const listHistory = wrapController(async (req, res) => {
    const { type } = req.query;
    const { page, pageSize } = parsePagination(req.query);
    const result = await copywritingService.getHistory(req.user.id, { type, page, pageSize });
    listResult(res, result);
}

// 删除历史记录
export const deleteHistory = wrapController(async (req, res) => {
    await copywritingService.deleteRecord(+req.params.id, req.user.id);
    success(res, null, '删除成功');
}
