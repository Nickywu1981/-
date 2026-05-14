import * as campaignDao from '../dao/campaignDao.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== Campaign ====================
export async function listCampaigns(query) {
  return campaignDao.listCampaigns(query);
}

export async function getCampaign(id, tenantId) {
  const c = await campaignDao.getCampaign(id, tenantId);
  if (!c) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return c;
}

export async function createCampaign(data) {
  if (!data.title) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  const id = await campaignDao.createCampaign(data);
  return campaignDao.getCampaign(id);
}

export async function updateCampaign(id, data) {
  const existing = await campaignDao.getCampaign(id);
  if (!existing) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  const ok = await campaignDao.updateCampaign(id, existing.tenant_id, data);
  if (!ok) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return campaignDao.getCampaign(id);
}

export async function deleteCampaign(id) {
  const existing = await campaignDao.getCampaign(id);
  if (!existing) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  const ok = await campaignDao.deleteCampaign(id, existing.tenant_id);
  if (!ok) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return true;
}

// ==================== Coupon ====================
export async function listCoupons(query) {
  return campaignDao.listCoupons(query);
}

export async function getCoupon(id) {
  const c = await campaignDao.getCoupon(id);
  if (!c) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return c;
}

export async function createCoupon(data) {
  if (!data.code || !data.name) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  const id = await campaignDao.createCoupon(data);
  return campaignDao.getCoupon(id);
}

export async function updateCoupon(id, data) {
  const existing = await campaignDao.getCoupon(id);
  if (!existing) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  const ok = await campaignDao.updateCoupon(id, existing.campaign_id, data);
  if (!ok) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return campaignDao.getCoupon(id);
}

export async function deleteCoupon(id) {
  const existing = await campaignDao.getCoupon(id);
  if (!existing) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  const ok = await campaignDao.deleteCoupon(id, existing.campaign_id);
  if (!ok) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
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
  if (!a) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return a;
}

export async function createAnnouncement(data) {
  if (!data.title || !data.content) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  const id = await campaignDao.createAnnouncement(data);
  return campaignDao.getAnnouncement(id);
}

export async function updateAnnouncement(id, data) {
  const existing = await campaignDao.getAnnouncement(id);
  if (!existing) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  const ok = await campaignDao.updateAnnouncement(id, existing.create_by, data);
  if (!ok) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return campaignDao.getAnnouncement(id);
}

export async function deleteAnnouncement(id) {
  const existing = await campaignDao.getAnnouncement(id);
  if (!existing) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  const ok = await campaignDao.deleteAnnouncement(id, existing.create_by);
  if (!ok) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return true;
}
