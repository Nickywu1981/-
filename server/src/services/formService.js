import { BusinessError } from '../utils/businessError.js';
import { FORM_ACCESS_TYPE } from '../constants/domainStatus.js';
/**
 * P2 增强表单服务 — 校验引擎 + 联动解析 + 脱敏 + 双端适配
 */
import formDao from '../dao/formDao.js';
import logger from '../utils/logger.js';

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
function filterFieldsByDevice(fields, _device) {
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
  if (!form) throw new BusinessError(404, '表单不存在');
  return form;
}

export async function createForm(tenantId, data) {
  if (!data.title || !data.formCode) throw new BusinessError(400, '标题和编码不能为空');

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
  if (!existing) throw new BusinessError(404, '表单不存在');

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
  if (!existing) throw new BusinessError(404, '表单不存在');
  await formDao.deleteForm(id, tenantId);
  return true;
}

// ── 公开表单(双端感知) ──
export async function getPublicForm(code, tenantId, { device = 'pc' } = {}) {
  const form = await formDao.getFormByCode(code, tenantId);
  if (!form) throw new BusinessError(404, '表单不存在或已关闭');
  if (form.access_type !== FORM_ACCESS_TYPE.PUBLIC) throw new BusinessError(403, '此表单不公开');
  if (form.start_time && new Date(form.start_time) > new Date()) throw new BusinessError(400, '表单尚未开放');
  if (form.end_time && new Date(form.end_time) < new Date()) throw new BusinessError(400, '表单已结束');
  if (form.submit_limit > 0 && form.submit_count >= form.submit_limit) throw new BusinessError(400, '已达提交上限');

  const fields = typeof form.fields_json === 'string' ? JSON.parse(form.fields_json) : form.fields_json;
  const deviceFields = filterFieldsByDevice(fields, device);

  return {
    title: form.title,
    description: form.description,
    fields: deviceFields.map(({ _validation_rules, _linkage_conditions, _masking_rule, _masking_pattern, ...rest }) => rest),
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
  if (!form) throw new BusinessError(404, '表单不存在或已关闭');
  if (form.access_type !== FORM_ACCESS_TYPE.PUBLIC) throw new BusinessError(403, '此表单不公开');
  if (form.start_time && new Date(form.start_time) > new Date()) throw new BusinessError(400, '表单尚未开放');
  if (form.end_time && new Date(form.end_time) < new Date()) throw new BusinessError(400, '表单已结束');

  // 每用户提交上限
  if (form.max_submissions_per_user > 0 && userId) {
    const userCount = await formDao.getUserSubmissionCount(form.id, userId);
    if (userCount >= form.max_submissions_per_user) throw new BusinessError(400, '您已达个人提交上限');
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
  if (errors.length) throw new BusinessError(400, errors.join('; '));

  // 3️⃣ 数据脱敏存储
  const maskedData = {};
  for (const [key, val] of Object.entries(rawData)) {
    const field = fields.find(f => (f.field_name || f.name) === key);
    maskedData[key] = field?.masking_rule
      ? maskValue(val, field.masking_rule, field.masking_pattern)
      : val;
  }

  // 4️⃣ 原子提交（TOCTOU 防护：原子递增+上限检查）
  const ipLong = ip ? ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0 : null;
  const id = await formDao.addSubmission({
    formId: form.id, tenantId, userId,
    dataJson: maskedData, ip, userAgent, deviceType, ipLong,
  });
  const incremented = await formDao.incrementSubmitCountAtomic(form.id, form.submit_limit);
  if (!incremented) {
    logger.warn(`[Form] 提交上限竞态拦截 formId=${form.id}`);
    throw new BusinessError(400, '已达提交上限');
  }

  // 5️⃣ 异步发邮件通知
  if (form.notify_email) {
    setImmediate(async () => {
      try {
        const { default: emailService } = await import('./emailService.js');
        const provider = emailService.getProvider ? emailService.getProvider() : null;
        if (provider) {
          await provider.send({
            email: form.notify_email,
            subject: `【表单通知】${form.title} - 新提交`,
            content: `<h3>${form.title}</h3><p>收到一条新提交，请登录后台查看。</p>`,
          });
        }
      } catch (e) { logger.warn('表单邮件通知失败:', e.message); }
    });
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

export async function exportSubmissions(formId, _format = 'csv') {
  const batchSize = 1000;
  let page = 1;
  let allRows = [];
  let batch;
  do {
    batch = await formDao.getAllSubmissions(formId, { page, pageSize: batchSize });
    allRows = allRows.concat(batch);
    page++;
  } while (batch.length === batchSize);
  if (!allRows.length) return { csv: '', count: 0 };
  const headers = Object.keys(allRows[0]).filter(k => k !== 'user_ip_long');
  const csvRows = [headers.join(',')];
  for (const row of allRows) {
    csvRows.push(headers.map(h => {
      const v = row[h];
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n\r]/.test(s) ? `"${s}"` : s;
    }).join(','));
  }
  return { csv: csvRows.join('\n'), count: allRows.length, headers };
}

// ── 字段管理(独立CRUD) ──
export async function listFields(formId, tenantId) {
  return formDao.listFields(formId, tenantId);
}

export async function upsertFields(formId, tenantId, fields) {
  const { withTransaction } = await import('../dao/diyDao.js');
  return withTransaction(async (conn) => {
    await formDao.deleteFields(formId, tenantId, conn);
    if (fields?.length) await formDao.batchInsertFields(tenantId, formId, fields, conn);
    return formDao.listFields(formId, tenantId);
  });
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
