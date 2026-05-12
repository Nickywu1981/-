import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import * as emailService from '../services/emailService.js';
import { success } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const sendVerificationCode = wrapController(async (req, res) => {
    const { email, scene } = req.body;
    if (!email || !scene) throw new BusinessError(ERROR_CODE.PARAM_MISSING, '邮箱和场景不能为空');
    if (!['register', 'login', 'reset_password', 'bind'].includes(scene)) {
      throw new BusinessError(ERROR_CODE.PARAM_INVALID, '不支持的邮件场景');
    }
    const result = await emailService.sendVerificationCode(email, scene);
    return success(res, { expireMinutes: result.expireMinutes }, '验证码已发送');
  });

export const verifyCode = wrapController(async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) throw new BusinessError(ERROR_CODE.PARAM_MISSING, '参数不完整');
    await emailService.verifyCode(email, code);
    return success(res, {}, '验证通过');
  });

// ==================== 模板管理（后台） ====================

export const listTemplates = wrapController(async (_req, res, next) => {
    const data = await emailService.listTemplates();
    return success(res, data);
  });

export const updateTemplate = wrapController(async (req, res) => {
    const data = await emailService.updateTemplate(req.params.id, req.body);
    return success(res, data, '邮件模板已更新');
  });

export const createTemplate = wrapController(async (req, res) => {
    const { id } = await emailService.createTemplate(req.body);
    return success(res, { id }, '邮件模板已创建');
  });

export const deleteTemplate = wrapController(async (req, res) => {
    await emailService.deleteTemplate(req.params.id);
    return success(res, {}, '邮件模板已删除');
  });
