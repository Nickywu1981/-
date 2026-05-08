import * as tenantService from '../services/tenantService.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export async function listTenants(req, res) {
  try {
    const list = await tenantService.listTenants();
    success(res, list);
  } catch (e) { error(res, ERROR_CODE.INTERNAL_ERROR, e.message); }
}

export async function getTenant(req, res) {
  try {
    const t = await tenantService.getTenantById(req.params.id);
    success(res, t);
  } catch (e) { error(res, e.statusCode || ERROR_CODE.NOT_FOUND, e.message); }
}

export async function createTenant(req, res) {
  try {
    const t = await tenantService.createTenant(req.body);
    success(res, t, '租户创建成功');
  } catch (e) { error(res, e.statusCode || ERROR_CODE.INTERNAL_ERROR, e.message); }
}

export async function updateTenant(req, res) {
  try {
    const t = await tenantService.updateTenant(req.params.id, req.body);
    success(res, t, '更新成功');
  } catch (e) { error(res, e.statusCode || ERROR_CODE.INTERNAL_ERROR, e.message); }
}

export async function deleteTenant(req, res) {
  try {
    await tenantService.deleteTenant(req.params.id);
    success(res, null, '租户已删除');
  } catch (e) { error(res, e.statusCode || ERROR_CODE.INTERNAL_ERROR, e.message); }
}

export async function getMyTenant(req, res) {
  try {
    const t = await tenantService.getTenantById(req.tenantId);
    success(res, { id: t.id, name: t.name, code: t.code, logo: t.logo, domain: t.domain, plan_type: t.plan_type, status: t.status, quota_images: t.quota_images, quota_video: t.quota_video, max_users: t.max_users, expire_time: t.expire_time });
  } catch (e) { error(res, e.statusCode || ERROR_CODE.INTERNAL_ERROR, e.message); }
}
