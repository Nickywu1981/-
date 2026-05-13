import * as customerDao from '../dao/customerDao.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export async function getCustomerList(tenantId, query) {
  const { page = 1, pageSize = 20, keyword, status, tagId, startDate, endDate } = query;
  const offset = (page - 1) * pageSize;
  const [total, list] = await Promise.all([
    customerDao.countCustomersByTenant(tenantId, { keyword, status, tagId, startDate, endDate }),
    customerDao.listCustomersByTenant(tenantId, { keyword, status, tagId, startDate, endDate, offset, pageSize }),
  ]);
  return { list, total, page, pageSize };
}

export async function getCustomerDetail(tenantId, userId) {
  const customer = await customerDao.getCustomerDetail(tenantId, userId);
  if (!customer) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return customer;
}

export async function getCustomerStats(tenantId) {
  return customerDao.getCustomerStats(tenantId);
}

// ==================== 标签管理 ====================

export async function createTag(tenantId, { name, color }) {
  const id = await customerDao.createTag(tenantId, { name, color });
  return { id, name, color };
}

export async function listTags(tenantId) {
  return customerDao.listTags(tenantId);
}

export async function updateTag(tenantId, tagId, data) {
  const ok = await customerDao.updateTag(tenantId, tagId, data);
  if (!ok) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return customerDao.getTagById(tenantId, tagId);
}

export async function deleteTag(tenantId, tagId) {
  const ok = await customerDao.deleteTag(tenantId, tagId);
  if (!ok) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
}

// ==================== 打标/取消打标 ====================

export async function tagCustomer(tenantId, tagId, userId) {
  const tag = await customerDao.getTagById(tenantId, tagId);
  if (!tag) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  await customerDao.tagCustomer(tagId, userId);
}

export async function untagCustomer(tenantId, tagId, userId) {
  await customerDao.untagCustomer(tagId, userId);
}

export async function batchTagCustomers(tenantId, tagId, userIds) {
  const tag = await customerDao.getTagById(tenantId, tagId);
  if (!tag) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  await customerDao.batchTagCustomers(tagId, userIds);
}
