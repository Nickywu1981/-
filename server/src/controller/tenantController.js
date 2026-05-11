import { wrapController } from '../utils/wrapController.js';
import * as tenantService from '../services/tenantService.js';
import { success } from '../utils/response.js';

export const listTenants = wrapController(async (req, res) => {
    const list = await tenantService.listTenants();
    success(res, list);
})

export const getTenant = wrapController(async (req, res) => {
    const t = await tenantService.getTenantById(req.params.id);
    success(res, t);
})

export const createTenant = wrapController(async (req, res) => {
    const t = await tenantService.createTenant(req.body);
    success(res, t, '租户创建成功');
})

export const updateTenant = wrapController(async (req, res) => {
    const t = await tenantService.updateTenant(req.params.id, req.body);
    success(res, t, '更新成功');
})

export const deleteTenant = wrapController(async (req, res) => {
    await tenantService.deleteTenant(req.params.id);
    success(res, null, '租户已删除');
})

export const reviewTenant = wrapController(async (req, res) => {
    const t = await tenantService.reviewTenant(req.params.id, req.body, req.user?.id);
    success(res, t, req.body.reviewStatus === 'approved' ? '审核通过' : '已驳回');
})

export const getMyTenant = wrapController(async (req, res) => {
    const t = await tenantService.getTenantById(req.tenantId);
    success(res, { id: t.id, name: t.name, code: t.code, logo: t.logo, domain: t.domain, plan_type: t.plan_type, status: t.status, quota_images: t.quota_images, quota_video: t.quota_video, max_users: t.max_users, expire_time: t.expire_time });
})
