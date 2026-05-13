import { wrapController } from '../utils/wrapController.js';
import * as campaignService from '../services/campaignService.js';
import { success, listResult } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';

const OVERRIDE_FIELDS = ['id', 'tenant_id', 'is_admin', 'role', 'created_at', 'updated_at', 'createdAt', 'updatedAt'];
function safeBody(body) {
  const s = {};
  for (const [k, v] of Object.entries(body)) {
    if (!OVERRIDE_FIELDS.includes(k)) s[k] = v;
  }
  return s;
}

// ==================== Campaign ====================
export const listCampaigns = wrapController(async (req) => {
  const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
  const data = await campaignService.listCampaigns({ page, pageSize, type: req.query.type, status: req.query.status !== undefined ? Number(req.query.status) : undefined });
  return listResult(req.res, data);
});

export const getCampaign = wrapController(async (req) => {
  return success(req.res, await campaignService.getCampaign(Number(req.params.id)));
});

export const createCampaign = wrapController(async (req) => {
  const data = { ...safeBody(req.body), tenant_id: req.user.entId || req.user.tenantId };
  return success(req.res, await campaignService.createCampaign(data), '活动创建成功');
});

export const updateCampaign = wrapController(async (req) => {
  return success(req.res, await campaignService.updateCampaign(Number(req.params.id), safeBody(req.body)), '更新成功');
});

export const deleteCampaign = wrapController(async (req) => {
  await campaignService.deleteCampaign(Number(req.params.id));
  return success(req.res, null, '活动已删除');
});

// ==================== Coupon ====================
export const listCoupons = wrapController(async (req) => {
  const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
  const data = await campaignService.listCoupons({ page, pageSize, status: req.query.status !== undefined ? Number(req.query.status) : undefined, campaignId: req.query.campaignId });
  return listResult(req.res, data);
});

export const getCoupon = wrapController(async (req) => {
  return success(req.res, await campaignService.getCoupon(Number(req.params.id)));
});

export const createCoupon = wrapController(async (req) => {
  return success(req.res, await campaignService.createCoupon(safeBody(req.body)), '优惠券创建成功');
});

export const updateCoupon = wrapController(async (req) => {
  return success(req.res, await campaignService.updateCoupon(Number(req.params.id), safeBody(req.body)), '更新成功');
});

export const deleteCoupon = wrapController(async (req) => {
  await campaignService.deleteCoupon(Number(req.params.id));
  return success(req.res, null, '优惠券已删除');
});

export const listUserCoupons = wrapController(async (req) => {
  const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
  const data = await campaignService.listUserCoupons({ page, pageSize, userId: req.query.userId, status: req.query.status !== undefined ? Number(req.query.status) : undefined });
  return listResult(req.res, data);
});

// ==================== Announcement ====================
export const listAnnouncements = wrapController(async (req) => {
  const { page, pageSize } = parsePagination(req.query, { maxPageSize: 100 });
  const data = await campaignService.listAnnouncements({ page, pageSize, type: req.query.type, status: req.query.status !== undefined ? Number(req.query.status) : undefined });
  return listResult(req.res, data);
});

export const getAnnouncement = wrapController(async (req) => {
  return success(req.res, await campaignService.getAnnouncement(Number(req.params.id)));
});

export const createAnnouncement = wrapController(async (req) => {
  const data = { ...safeBody(req.body), create_by: req.user?.id };
  return success(req.res, await campaignService.createAnnouncement(data), '公告创建成功');
});

export const updateAnnouncement = wrapController(async (req) => {
  return success(req.res, await campaignService.updateAnnouncement(Number(req.params.id), safeBody(req.body)), '更新成功');
});

export const deleteAnnouncement = wrapController(async (req) => {
  await campaignService.deleteAnnouncement(Number(req.params.id));
  return success(req.res, null, '公告已删除');
});
