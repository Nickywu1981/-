import * as formService from '../services/formService.js';
import { success, error } from '../utils/response.js';

export async function listForms(req, res) {
  try {
    const result = await formService.listForms(req.tenantId, req.query);
    success(res, result);
  } catch (e) { error(res, 500, e.message); }
}

export async function getFormById(req, res) {
  try {
    const form = await formService.getFormById(req.params.id, req.tenantId);
    success(res, form);
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

export async function createForm(req, res) {
  try {
    const form = await formService.createForm(req.tenantId, req.body);
    success(res, form, '表单创建成功');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

export async function updateForm(req, res) {
  try {
    const form = await formService.updateForm(req.params.id, req.tenantId, req.body);
    success(res, form, '更新成功');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

export async function deleteForm(req, res) {
  try {
    await formService.deleteForm(req.params.id, req.tenantId);
    success(res, null, '删除成功');
  } catch (e) { error(res, 500, e.message); }
}

// ── 公开接口 ──
export async function getPublicForm(req, res) {
  try {
    const device = req.query.device || req.headers['x-device-type'] || 'pc';
    const form = await formService.getPublicForm(req.params.code, req.tenantId || 1, { device });
    success(res, form);
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

export async function submitForm(req, res) {
  try {
    const deviceType = req.headers['x-device-type'] || 'pc';
    const data = await formService.submitForm(
      req.params.code, req.tenantId || 1, req.user?.userId,
      req.body.fields || req.body, req.ip, req.headers['user-agent'], deviceType,
    );
    success(res, data, '提交成功');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

// ── 提交管理 ──
export async function listSubmissions(req, res) {
  try {
    const result = await formService.listSubmissions(req.params.id, req.query);
    success(res, result);
  } catch (e) { error(res, 500, e.message); }
}

export async function updateSubmission(req, res) {
  try {
    await formService.updateSubmission(req.params.subId, req.body);
    success(res, null, '更新成功');
  } catch (e) { error(res, 500, e.message); }
}

export async function exportSubmissions(req, res) {
  try {
    const rows = await formService.exportSubmissions(req.params.id, req.query.format || 'csv');
    success(res, rows);
  } catch (e) { error(res, 500, e.message); }
}

// ── 字段管理 ──
export async function listFields(req, res) {
  try {
    const fields = await formService.listFields(req.params.id, req.tenantId);
    success(res, fields);
  } catch (e) { error(res, 500, e.message); }
}

export async function upsertFields(req, res) {
  try {
    const fields = await formService.upsertFields(req.params.id, req.tenantId, req.body.fields);
    success(res, fields, '字段更新成功');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}
