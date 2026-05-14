import * as tenantDao from '../dao/tenantDao.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export async function listTenants() {
  const result = await tenantDao.list();
  return result.list;
}

export async function getTenantById(id) {
  const t = await tenantDao.findById(id);
  if (!t) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return t;
}

export async function createTenant(data) {
  const { name, code } = data;
  if (!name || !code) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  const exist = await tenantDao.findByCode(code);
  if (exist) throw new BusinessError(ERROR_CODE.RESOURCE_DUPLICATE);

  const insertId = await tenantDao.create(data);
  return tenantDao.findById(insertId);
}

export async function updateTenant(id, data) {
  const fields = ['name', 'logo', 'domain', 'plan_type', 'status', 'contact_name', 'contact_phone', 'contact_email', 'address', 'max_users', 'quota_images', 'quota_video', 'expire_time'];
  const updates = {};
  for (const k of fields) {
    if (data[k] !== undefined) updates[k] = data[k];
  }
  if (!Object.keys(updates).length) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  const ok = await tenantDao.update(id, updates);
  if (!ok) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return tenantDao.findById(id);
}

export async function deleteTenant(id) {
  const ok = await tenantDao.remove(id);
  if (!ok) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return true;
}

export async function reviewTenant(id, { reviewStatus, reviewRemark }, reviewedBy) {
  if (!['approved', 'rejected'].includes(reviewStatus)) {
    throw new BusinessError(ERROR_CODE.PARAM_INVALID);
  }
  const ok = await tenantDao.review(id, { reviewStatus, reviewRemark, reviewedBy });
  if (!ok) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return tenantDao.findById(id);
}
