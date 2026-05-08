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

export async function getPublicForm(req, res) {
  try {
    const form = await formService.getPublicForm(req.params.code, req.tenantId || 1);
    success(res, form);
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

export async function submitForm(req, res) {
  try {
    const data = await formService.submitForm(req.params.code, req.tenantId || 1, req.user?.userId, req.body, req.ip, req.headers['user-agent']);
    success(res, data, '提交成功');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

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
