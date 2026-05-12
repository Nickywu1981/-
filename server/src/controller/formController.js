import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import * as formService from '../services/formService.js';
import { success } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const listForms = wrapController(async (req, res) => {
    const result = await formService.listForms(req.tenantId, req.query);
    success(res, result);
});

export const getFormById = wrapController(async (req, res) => {
    const form = await formService.getFormById(req.params.id, req.tenantId);
    success(res, form);
});

export const createForm = wrapController(async (req, res) => {
    const form = await formService.createForm(req.tenantId, req.body);
    success(res, form, '表单创建成功');
});

export const updateForm = wrapController(async (req, res) => {
    const form = await formService.updateForm(req.params.id, req.tenantId, req.body);
    success(res, form, '更新成功');
});

export const deleteForm = wrapController(async (req, res) => {
    await formService.deleteForm(req.params.id, req.tenantId);
    success(res, null, '删除成功');
});

// ── 公开接口 ──
export const getPublicForm = wrapController(async (req, res) => {
    if (!req.tenantId) throw new BusinessError(ERROR_CODE.BAD_REQUEST, '租户信息缺失');
    const device = req.query.device || req.headers['x-device-type'] || 'pc';
    const form = await formService.getPublicForm(req.params.code, req.tenantId, { device });
    success(res, form);
});

export const submitForm = wrapController(async (req, res) => {
    if (!req.tenantId) throw new BusinessError(ERROR_CODE.BAD_REQUEST, '租户信息缺失');
    const deviceType = req.headers['x-device-type'] || 'pc';
    const data = await formService.submitForm(
      req.params.code, req.tenantId, req.user?.userId,
      req.body.fields || req.body, req.ip, req.headers['user-agent'], deviceType,
    );
    success(res, data, '提交成功');
});

// ── 提交管理 ──
export const listSubmissions = wrapController(async (req, res) => {
    const result = await formService.listSubmissions(req.params.id, req.query);
    success(res, result);
});

export const updateSubmission = wrapController(async (req, res) => {
    await formService.updateSubmission(req.params.subId, req.params.id, req.body);
    success(res, null, '更新成功');
});

export const exportSubmissions = wrapController(async (req, res) => {
    const rows = await formService.exportSubmissions(req.params.id, req.query.format || 'csv');
    success(res, rows);
});

// ── 字段管理 ──
export const listFields = wrapController(async (req, res) => {
    const fields = await formService.listFields(req.params.id, req.tenantId);
    success(res, fields);
});

export const upsertFields = wrapController(async (req, res) => {
    const fields = await formService.upsertFields(req.params.id, req.tenantId, req.body.fields);
    success(res, fields, '字段更新成功');
});
