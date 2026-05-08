import helpService from '../services/helpService.js';
import { success, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';

export async function getFaqs(req, res) {
  try {
    const { keyword } = req.query;
    const { page, pageSize } = parsePagination(req.query, { defaultPageSize: 50, maxPageSize: 100 });
    const data = await helpService.getFaqs({ keyword, page, pageSize });
    success(res, data);
  } catch (e) {
    error(res, e.message, 500);
  }
}

export async function getFaqById(req, res) {
  try {
    const faq = await helpService.getFaqById(req.params.id);
    if (!faq) return error(res, 'FAQ不存在', 404);
    success(res, faq);
  } catch (e) {
    error(res, e.message, 500);
  }
}

export async function createFaq(req, res) {
  try {
    const id = await helpService.createFaq(req.body);
    success(res, { id }, '创建成功');
  } catch (e) {
    error(res, e.message, 500);
  }
}

export async function updateFaq(req, res) {
  try {
    await helpService.updateFaq(req.params.id, req.body);
    success(res, null, '更新成功');
  } catch (e) {
    error(res, e.message, 500);
  }
}

export async function deleteFaq(req, res) {
  try {
    await helpService.deleteFaq(req.params.id);
    success(res, null, '删除成功');
  } catch (e) {
    error(res, e.message, 500);
  }
}
