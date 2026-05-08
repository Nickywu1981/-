/**
 * P2 增强表单服务 — 校验引擎 + 联动解析 + 脱敏 + 双端适配
 */
import formDao from '../dao/formDao.js';

// ── 校验引擎 ──
const VALIDATORS = {
  required: (v) => v !== undefined && v !== null && v !== '',
  regex: (v, { value, flags }) => new RegExp(value, flags || '').test(String(v)),
  min: (v, { value }) => (typeof v === 'number' ? v >= value : String(v).length >= value),
  max: (v, { value }) => (typeof v === 'number' ? v <= value : String(v).length <= value),
  minLength: (v, { value }) => String(v).length >= value,
  maxLength: (v, { value }) => String(v).length <= value,
  range: (v, { min, max }) => Number(v) >= min && Number(v) <= max,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone: (v) => /^1[3-9]\d{9}$/.test(v),
  url: (v) => /^https?:\/\/.+/.test(v),
  number: (v) => !isNaN(Number(v)),
  integer: (v) => Number.isInteger(Number(v)),
  positive: (v) => Number(v) > 0,
  fileType: (v, { value }) => (Array.isArray(value) ? value : [value]).some(t => String(v).endsWith(t)),
};

function validateField(value, rules) {
  if (!rules || !Array.isArray(rules)) return null;
  for (const rule of rules) {
    const fn = VALIDATORS[rule.rule];
    if (!fn) continue;
    const valid = fn(value, rule);
    if (!valid) return rule.message || `字段校验失败: ${rule.rule}`;
  }
  return null;
}

// ── 联动解析 ──
function resolveLinkage(field, allValues) {
  const conditions = field.linkage_conditions;
  if (!conditions || !Array.isArray(conditions)) return true; // 无条件=始终可见

  return conditions.every(cond => {
    const targetValue = allValues[cond.targetField];
    switch (cond.operator) {
      case 'eq': return targetValue === cond.value;
      case 'neq': return targetValue !== cond.value;
      case 'gt': return Number(targetValue) > Number(cond.value);
      case 'lt': return Number(targetValue) < Number(cond.value);
      case 'gte': return Number(targetValue) >= Number(cond.value);
      case 'lte': return Number(targetValue) <= Number(cond.value);
      case 'in': return Array.isArray(cond.value) && cond.value.includes(targetValue);
      case 'contains': return String(targetValue).includes(String(cond.value));
      case 'notEmpty': return targetValue !== undefined && targetValue !== null && targetValue !== '';
      case 'isEmpty': return targetValue === undefined || targetValue === null || targetValue === '';
      default: return true;
    }
  });
}

// ── 脱敏引擎 ──
function maskValue(value, rule, pattern) {
  if (value === undefined || value === null || value === '') return value;
  const s = String(value);
  switch (rule) {
    case 'phone': return s.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    case 'email': return s.replace(/(.{2}).*(@.*)/, '$1***$2');
    case 'idcard': return s.replace(/(\d{4})\d{10}(\d{4})/, '$1**********$2');
    case 'name': return s.length > 1 ? s[0] + '*'.repeat(s.length > 2 ? s.length - 2 : 1) + s[s.length - 1] : s + '*';
    case 'custom': return pattern ? s.replace(new RegExp(pattern), '***') : s;
    default: return s;
  }
}

// ── 字段过滤(双端适配) ──
function filterFieldsByDevice(fields, device) {
  if (!fields) return [];
  return fields
    .filter(f => f.is_visible !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

// ════════════════════════════════════════
// 公开 API
// ════════════════════════════════════════

export async function listForms(tenantId, { page = 1, pageSize = 20, keyword, status }) {
  return formDao.listForms(tenantId, { page, pageSize, keyword, status });
}

export async function getFormById(id, tenantId) {
  const form = await formDao.getFormById(id, tenantId);
  if (!form) throw Object.assign(new Error('表单不存在'), { statusCode: 404 });
  return form;
}

export async function createForm(tenantId, data) {
  if (!data.title || !data.formCode) throw Object.assign(new Error('标题和编码不能为空'), { statusCode: 400 });

  // 规范化字段结构
  const fields = (data.fields || []).map((f, i) => ({
    ...f,
    sort_order: f.sort_order ?? i,
    is_visible: f.is_visible ?? true,
    is_required: f.is_required ?? f.required ?? false,
    pc_col_span: f.pc_col_span ?? 12,
    mobile_col_span: f.mobile_col_span ?? 12,
  }));

  const id = await formDao.createForm({
    tenantId,
    title: data.title,
    formCode: data.formCode,
    description: data.description,
    fields,
    pcConfig: data.pcConfig || {},
    mobileConfig: data.mobileConfig || {},
    submitLimit: data.submitLimit || 0,
    maxSubmissionsPerUser: data.maxSubmissionsPerUser || 0,
    startTime: data.startTime,
    endTime: data.endTime,
    successMsg: data.successMsg,
    redirectUrl: data.redirectUrl,
    notifyEmail: data.notifyEmail,
    accessType: data.accessType ?? 1,
    ownerId: data.ownerId,
  });
  return formDao.getFormById(id, tenantId);
}

export async function updateForm(id, tenantId, data) {
  const existing = await formDao.getFormById(id, tenantId);
  if (!existing) throw Object.assign(new Error('表单不存在'), { statusCode: 404 });

  if (data.fields) {
    data.fields = data.fields.map((f, i) => ({
      ...f,
      sort_order: f.sort_order ?? i,
      is_visible: f.is_visible ?? true,
      is_required: f.is_required ?? f.required ?? false,
    }));
  }

  await formDao.updateForm(id, tenantId, data);
  return formDao.getFormById(id, tenantId);
}

export async function deleteForm(id, tenantId) {
  const existing = await formDao.getFormById(id, tenantId);
  if (!existing) throw Object.assign(new Error('表单不存在'), { statusCode: 404 });
  await formDao.deleteForm(id, tenantId);
  return true;
}

// ── 公开表单(双端感知) ──
export async function getPublicForm(code, tenantId, { device = 'pc' } = {}) {
  const form = await formDao.getFormByCode(code, tenantId);
  if (!form) throw Object.assign(new Error('表单不存在或已关闭'), { statusCode: 404 });
  if (form.access_type !== 1) throw Object.assign(new Error('此表单不公开'), { statusCode: 403 });
  if (form.start_time && new Date(form.start_time) > new Date()) throw Object.assign(new Error('表单尚未开放'), { statusCode: 400 });
  if (form.end_time && new Date(form.end_time) < new Date()) throw Object.assign(new Error('表单已结束'), { statusCode: 400 });
  if (form.submit_limit > 0 && form.submit_count >= form.submit_limit) throw Object.assign(new Error('已达提交上限'), { statusCode: 400 });

  const fields = typeof form.fields_json === 'string' ? JSON.parse(form.fields_json) : form.fields_json;
  const deviceFields = filterFieldsByDevice(fields, device);

  return {
    title: form.title,
    description: form.description,
    fields: deviceFields.map(({ validation_rules, linkage_conditions, masking_rule, masking_pattern, ...rest }) => rest),
    config: device === 'mobile' ? form.mobile_config : form.pc_config,
    successMsg: form.success_msg,
    redirectUrl: form.redirect_url,
    startTime: form.start_time,
    endTime: form.end_time,
  };
}

// ── 表单提交(完整校验+联动+脱敏) ──
export async function submitForm(code, tenantId, userId, rawData, ip, userAgent, deviceType) {
  const form = await formDao.getFormByCode(code, tenantId);
  if (!form) throw Object.assign(new Error('表单不存在或已关闭'), { statusCode: 404 });
  if (form.access_type !== 1) throw Object.assign(new Error('此表单不公开'), { statusCode: 403 });
  if (form.start_time && new Date(form.start_time) > new Date()) throw Object.assign(new Error('表单尚未开放'), { statusCode: 400 });
  if (form.end_time && new Date(form.end_time) < new Date()) throw Object.assign(new Error('表单已结束'), { statusCode: 400 });
  if (form.submit_limit > 0 && form.submit_count >= form.submit_limit) throw Object.assign(new Error('已达提交上限'), { statusCode: 400 });

  // 每用户提交上限
  if (form.max_submissions_per_user > 0 && userId) {
    const userCount = await formDao.getUserSubmissionCount(form.id, userId);
    if (userCount >= form.max_submissions_per_user) throw Object.assign(new Error('您已达个人提交上限'), { statusCode: 400 });
  }

  const fields = typeof form.fields_json === 'string' ? JSON.parse(form.fields_json) : form.fields_json;

  // 1️⃣ 联动解析 — 确定哪些字段当前可见/启用
  const visibleFields = fields.filter(f => resolveLinkage(f, rawData) && f.is_visible !== false);

  // 2️⃣ 字段校验
  const errors = [];
  for (const f of visibleFields) {
    // 必填校验
    if (f.is_required && (rawData[f.field_name || f.name] === undefined || rawData[f.field_name || f.name] === '')) {
      errors.push(`${f.field_label || f.label} 不能为空`);
      continue;
    }
    // 自定义校验规则
    const val = rawData[f.field_name || f.name];
    if (val !== undefined && val !== '' && f.validation_rules) {
      const errMsg = validateField(val, f.validation_rules);
      if (errMsg) errors.push(`${f.field_label || f.label}: ${errMsg}`);
    }
  }
  if (errors.length) throw Object.assign(new Error(errors.join('; ')), { statusCode: 400 });

  // 3️⃣ 数据脱敏存储
  const maskedData = {};
  for (const [key, val] of Object.entries(rawData)) {
    const field = fields.find(f => (f.field_name || f.name) === key);
    maskedData[key] = field?.masking_rule
      ? maskValue(val, field.masking_rule, field.masking_pattern)
      : val;
  }

  // 4️⃣ 提交
  const ipLong = ip ? ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0 : null;
  const id = await formDao.addSubmission({
    formId: form.id, tenantId, userId,
    dataJson: maskedData, ip, userAgent, deviceType, ipLong,
  });
  await formDao.incrementSubmitCount(form.id);

  // 5️⃣ 异步发邮件通知(占位)
  if (form.notify_email) {
    // TODO: 接入邮件服务
  }

  return { id, redirectUrl: form.redirect_url };
}

// ── 提交记录 ──
export async function listSubmissions(formId, { page = 1, pageSize = 50, status, dataStatus, startDate, endDate }) {
  return formDao.listSubmissions(formId, { page, pageSize, status, dataStatus, startDate, endDate });
}

export async function updateSubmission(subId, data) {
  await formDao.updateSubmission(subId, data);
  return true;
}

export async function exportSubmissions(formId, format = 'csv') {
  const rows = await formDao.getAllSubmissions(formId);
  // TODO: EasyExcel 格式导出
  return rows;
}

// ── 字段管理(独立CRUD) ──
export async function listFields(formId, tenantId) {
  return formDao.listFields(formId, tenantId);
}

export async function upsertFields(formId, tenantId, fields) {
  await formDao.deleteFields(formId);
  if (fields?.length) await formDao.batchInsertFields(tenantId, formId, fields);
  return formDao.listFields(formId, tenantId);
}

// ── 数据清理(定时任务) ──
export async function cleanExpiredData() {
  const forms = await formDao.getFormsWithRetention();
  for (const f of forms) {
    if (f.data_retention_days > 0) {
      const cutoff = new Date(Date.now() - f.data_retention_days * 86400000);
      await formDao.deleteExpiredSubmissions(f.id, cutoff);
    }
  }
}
