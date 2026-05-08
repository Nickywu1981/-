import tenantDao from '../dao/tenantDao.js';

export async function listTenants() {
  const result = await tenantDao.list();
  return result.list;
}

export async function getTenantById(id) {
  const t = await tenantDao.findById(id);
  if (!t) throw Object.assign(new Error('租户不存在'), { statusCode: 404 });
  return t;
}

export async function createTenant(data) {
  const { name, code } = data;
  if (!name || !code) throw Object.assign(new Error('租户名称和编码不能为空'), { statusCode: 400 });

  const exist = await tenantDao.findByCode(code);
  if (exist) throw Object.assign(new Error('租户编码已存在'), { statusCode: 400 });

  const insertId = await tenantDao.create(data);
  return tenantDao.findById(insertId);
}

export async function updateTenant(id, data) {
  const fields = ['name', 'logo', 'domain', 'plan_type', 'status', 'contact_name', 'contact_phone', 'contact_email', 'address', 'max_users', 'quota_images', 'quota_video', 'expire_time'];
  const updates = {};
  for (const k of fields) {
    if (data[k] !== undefined) updates[k] = data[k];
  }
  if (!Object.keys(updates).length) throw Object.assign(new Error('无有效更新字段'), { statusCode: 400 });

  const ok = await tenantDao.update(id, updates);
  if (!ok) throw Object.assign(new Error('租户不存在'), { statusCode: 404 });
  return tenantDao.findById(id);
}

export async function deleteTenant(id) {
  const ok = await tenantDao.delete(id);
  if (!ok) throw Object.assign(new Error('租户不存在'), { statusCode: 404 });
  return true;
}
