import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import helpService from '../services/helpService.js';
import { success } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const getFaqs = wrapController(async (req, res) => {
    const { keyword } = req.query;
    const { page, pageSize } = parsePagination(req.query, { defaultPageSize: 50, maxPageSize: 100 });
    const data = await helpService.getFaqs({ keyword, page, pageSize });
    success(res, data);
});

export const getFaqById = wrapController(async (req, res) => {
    const faq = await helpService.getFaqById(req.params.id);
    if (!faq) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    success(res, faq);
});

export const createFaq = wrapController(async (req, res) => {
    const id = await helpService.createFaq(req.body);
    success(res, { id }, '创建成功');
});

export const updateFaq = wrapController(async (req, res) => {
    await helpService.updateFaq(req.params.id, req.body);
    success(res, null, '更新成功');
});

export const deleteFaq = wrapController(async (req, res) => {
    await helpService.deleteFaq(req.params.id);
    success(res, null, '删除成功');
});
