import campaignDao from '../dao/campaignDao.js';
import { BusinessError } from '../utils/businessError.js';

// ==================== Campaign ====================
export async function listCampaigns(query) {
  return campaignDao.listCampaigns(query);
}

export async function getCampaign(id) {
  const c = await campaignDao.getCampaign(id);
  if (!c) throw new BusinessError(404, '活动不存在');
  return c;
}

export async function createCampaign(data) {
  if (!data.title) throw new BusinessError(400, '活动标题不能为空');
  const id = await campaignDao.createCampaign(data);
  return campaignDao.getCampaign(id);
}

export async function updateCampaign(id, data) {
  const ok = await campaignDao.updateCampaign(id, data);
  if (!ok) throw new BusinessError(404, '活动不存在');
  return campaignDao.getCampaign(id);
}

export async function deleteCampaign(id) {
  const ok = await campaignDao.deleteCampaign(id);
  if (!ok) throw new BusinessError(404, '活动不存在');
  return true;
}

// ==================== Coupon ====================
export async function listCoupons(query) {
  return campaignDao.listCoupons(query);
}

export async function getCoupon(id) {
  const c = await campaignDao.getCoupon(id);
  if (!c) throw new BusinessError(404, '优惠券不存在');
  return c;
}

export async function createCoupon(data) {
  if (!data.code || !data.name) throw new BusinessError(400, '优惠券编码和名称不能为空');
  const id = await campaignDao.createCoupon(data);
  return campaignDao.getCoupon(id);
}

export async function updateCoupon(id, data) {
  const ok = await campaignDao.updateCoupon(id, data);
  if (!ok) throw new BusinessError(404, '优惠券不存在');
  return campaignDao.getCoupon(id);
}

export async function deleteCoupon(id) {
  const ok = await campaignDao.deleteCoupon(id);
  if (!ok) throw new BusinessError(404, '优惠券不存在');
  return true;
}

export async function listUserCoupons(query) {
  return campaignDao.getUserCoupons(query);
}

// ==================== Announcement ====================
export async function listAnnouncements(query) {
  return campaignDao.listAnnouncements(query);
}

export async function getAnnouncement(id) {
  const a = await campaignDao.getAnnouncement(id);
  if (!a) throw new BusinessError(404, '公告不存在');
  return a;
}

export async function createAnnouncement(data) {
  if (!data.title || !data.content) throw new BusinessError(400, '公告标题和内容不能为空');
  const id = await campaignDao.createAnnouncement(data);
  return campaignDao.getAnnouncement(id);
}

export async function updateAnnouncement(id, data) {
  const ok = await campaignDao.updateAnnouncement(id, data);
  if (!ok) throw new BusinessError(404, '公告不存在');
  return campaignDao.getAnnouncement(id);
}

export async function deleteAnnouncement(id) {
  const ok = await campaignDao.deleteAnnouncement(id);
  if (!ok) throw new BusinessError(404, '公告不存在');
  return true;
}
