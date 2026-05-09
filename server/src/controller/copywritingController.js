import * as copywritingService from '../services/copywritingService.js';
import { success, error, listResult } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';

// 商品标题生成
export async function generateTitles(req, res) {
  try {
    const result = await copywritingService.generateTitles(req.user.id, req.body);
    success(res, result, '标题生成成功');
  } catch (e) { error(res, e.status || 500, e.message); }
}

// 卖点文案生成
export async function generateDescription(req, res) {
  try {
    const result = await copywritingService.generateDescription(req.user.id, req.body);
    success(res, result, '卖点文案生成成功');
  } catch (e) { error(res, e.status || 500, e.message); }
}

// 跨境多语言翻译
export async function translateProduct(req, res) {
  try {
    const result = await copywritingService.translateProduct(req.user.id, req.body);
    success(res, result, '翻译成功');
  } catch (e) { error(res, e.status || 500, e.message); }
}

// 短视频脚本生成
export async function generateScript(req, res) {
  try {
    const result = await copywritingService.generateScript(req.user.id, req.body);
    success(res, result, '脚本生成成功');
  } catch (e) { error(res, e.status || 500, e.message); }
}

// 平台列表
export async function listPlatforms(_req, res) {
  try {
    success(res, copywritingService.getPlatforms());
  } catch (e) { error(res, e.status || 500, e.message); }
}

// 语言列表
export async function listLanguages(_req, res) {
  try {
    success(res, copywritingService.getLanguages());
  } catch (e) { error(res, e.status || 500, e.message); }
}

// 生成历史
export async function listHistory(req, res) {
  try {
    const { type } = req.query;
    const { page, pageSize } = parsePagination(req.query);
    const result = await copywritingService.getHistory(req.user.id, { type, page, pageSize });
    listResult(res, result);
  } catch (e) { error(res, e.status || 500, e.message); }
}

// 删除历史记录
export async function deleteHistory(req, res) {
  try {
    await copywritingService.deleteRecord(+req.params.id, req.user.id);
    success(res, null, '删除成功');
  } catch (e) { error(res, e.status || 500, e.message); }
}
