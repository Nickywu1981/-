import * as emailService from '../services/emailService.js';
import * as emailTemplateDao from '../dao/emailTemplateDao.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export async function sendVerificationCode(req, res, next) {
  try {
    const { email, scene } = req.body;
    if (!email || !scene) return error(res, ERROR_CODE.PARAM_MISSING, '邮箱和场景不能为空');
    if (!['register', 'login', 'reset_password', 'bind'].includes(scene)) {
      return error(res, ERROR_CODE.PARAM_INVALID, '不支持的邮件场景');
    }
    const result = await emailService.sendVerificationCode(email, scene);
    return success(res, { expireMinutes: result.expireMinutes }, '验证码已发送');
  } catch (err) { next(err); }
}

export async function verifyCode(req, res, next) {
  try {
    const { email, code } = req.body;
    if (!email || !code) return error(res, ERROR_CODE.PARAM_MISSING, '参数不完整');
    emailService.verifyCode(email, code);
    return success(res, {}, '验证通过');
  } catch (err) { next(err); }
}

// ==================== 模板管理（后台） ====================

export async function listTemplates(_req, res, next) {
  try {
    const data = await emailTemplateDao.listTemplates();
    return success(res, data);
  } catch (err) { next(err); }
}

export async function updateTemplate(req, res, next) {
  try {
    const data = await emailTemplateDao.updateTemplate(req.params.id, req.body);
    return success(res, data, '邮件模板已更新');
  } catch (err) { next(err); }
}

export async function createTemplate(req, res, next) {
  try {
    const id = await emailTemplateDao.insertTemplate(req.body);
    return success(res, { id }, '邮件模板已创建');
  } catch (err) { next(err); }
}

export async function deleteTemplate(req, res, next) {
  try {
    await emailTemplateDao.deleteTemplate(req.params.id);
    return success(res, {}, '邮件模板已删除');
  } catch (err) { next(err); }
}
