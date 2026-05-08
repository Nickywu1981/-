import formDao from '../dao/formDao.js';

export async function listForms(tenantId, { page = 1, pageSize = 20, keyword, status }) {
  return formDao.listForms(tenantId, { page, pageSize, keyword, status });
}

export async function getFormById(id, tenantId) {
  const form = await formDao.getFormById(id, tenantId);
  if (!form) throw Object.assign(new Error('表单不存在'), { statusCode: 404 });
  return form;
}

export async function createForm(tenantId, data) {
  if (!data.title || !data.formCode || !data.fields?.length) throw Object.assign(new Error('标题、编码和字段不能为空'), { statusCode: 400 });
  const id = await formDao.createForm({ tenantId, ...data });
  return formDao.getFormById(id, tenantId);
}

export async function updateForm(id, tenantId, data) {
  await formDao.updateForm(id, tenantId, data);
  return formDao.getFormById(id, tenantId);
}

export async function deleteForm(id, tenantId) {
  await formDao.deleteForm(id, tenantId);
  return true;
}

export async function getPublicForm(code, tenantId) {
  const form = await formDao.getFormByCode(code, tenantId);
  if (!form) throw Object.assign(new Error('表单不存在或已关闭'), { statusCode: 404 });
  if (form.start_time && new Date(form.start_time) > new Date()) throw Object.assign(new Error('表单尚未开放'), { statusCode: 400 });
  if (form.end_time && new Date(form.end_time) < new Date()) throw Object.assign(new Error('表单已结束'), { statusCode: 400 });
  if (form.submit_limit && form.submit_count >= form.submit_limit) throw Object.assign(new Error('已达提交上限'), { statusCode: 400 });

  return {
    title: form.title, description: form.description,
    fields: typeof form.fields_json === 'string' ? JSON.parse(form.fields_json) : form.fields_json,
    successMsg: form.success_msg, startTime: form.start_time, endTime: form.end_time,
  };
}

export async function submitForm(code, tenantId, userId, submitData, ip, userAgent) {
  const form = await formDao.getFormByCode(code, tenantId);
  if (!form) throw Object.assign(new Error('表单不存在或已关闭'), { statusCode: 404 });
  if (form.start_time && new Date(form.start_time) > new Date()) throw Object.assign(new Error('表单尚未开放'), { statusCode: 400 });
  if (form.end_time && new Date(form.end_time) < new Date()) throw Object.assign(new Error('表单已结束'), { statusCode: 400 });
  if (form.submit_limit && form.submit_count >= form.submit_limit) throw Object.assign(new Error('已达提交上限'), { statusCode: 400 });

  const fields = typeof form.fields_json === 'string' ? JSON.parse(form.fields_json) : form.fields_json;
  for (const f of fields) {
    if (f.required && submitData[f.name] === undefined && submitData[f.name] !== 0 && submitData[f.name] !== false)
      throw Object.assign(new Error(`${f.label} 不能为空`), { statusCode: 400 });
  }

  const id = await formDao.addSubmission({ formId: form.id, tenantId, userId, dataJson: submitData, ip, userAgent });
  await formDao.incrementSubmitCount(form.id);
  return { id };
}

export async function listSubmissions(formId, { page = 1, pageSize = 50, status }) {
  return formDao.listSubmissions(formId, { page, pageSize, status });
}

export async function updateSubmission(subId, data) {
  await formDao.updateSubmission(subId, data);
  return true;
}
