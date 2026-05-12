import { wrapController } from '../utils/wrapController.js';
import { BusinessError } from '../utils/businessError.js';
import * as smsService from '../services/smsService.js';
import { success, listResult } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 发送验证码（公开） ====================

export const sendVerificationCode = wrapController(async (req, res) => {
    const { phone, scene } = req.body;
    if (!phone || !scene) throw new BusinessError(ERROR_CODE.PARAM_MISSING, '手机号和场景不能为空');
    if (!['register', 'login', 'reset_password', 'bind'].includes(scene)) {
      throw new BusinessError(ERROR_CODE.PARAM_INVALID, '不支持的短信场景');
    }
    const result = await smsService.sendVerificationCode({ phone, scene });
    if (!result.success) throw new BusinessError(ERROR_CODE.BAD_REQUEST, result.msg);
    return success(res, { expire: result.expire }, result.msg);
  });

// ==================== 校验验证码（公开） ====================

export const verifyCode = wrapController(async (req, res) => {
    const { phone, scene, code } = req.body;
    if (!phone || !scene || !code) throw new BusinessError(ERROR_CODE.PARAM_MISSING, '参数不完整');
    const result = await smsService.verifyCode(phone, scene, code);
    if (!result.valid) throw new BusinessError(ERROR_CODE.BAD_REQUEST, result.reason);
    return success(res, {}, '验证通过');
  });

// ==================== 模板管理（后台） ====================

export const listTemplates = wrapController(async (_req, res, next) => {
    const data = await smsService.getTemplates();
    return success(res, data);
  });

export const updateTemplate = wrapController(async (req, res) => {
    const data = await smsService.updateTemplate(req.params.id, req.body);
    return success(res, data, '短信模板已更新');
  });

export const createTemplate = wrapController(async (req, res) => {
    const id = await smsService.createTemplate(req.body);
    return success(res, { id }, '短信模板已创建');
  });

export const deleteTemplate = wrapController(async (req, res) => {
    await smsService.deleteTemplate(req.params.id);
    return success(res, {}, '短信模板已删除');
  });

// ==================== 发送日志（后台） ====================

export const listLogs = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query, { defaultPageSize: 30 });
    const { phone, result, startDate, endDate } = req.query;
    const data = await smsService.getLogs({ page, pageSize, phone, result, startDate, endDate });
    return listResult(res, data);
  });

// ==================== 通知类发送（内部调用/后台手动触发） ====================

export const sendNotification = wrapController(async (req, res) => {
    const { phone, scene, templateCode, params } = req.body;
    if (!phone || (!scene && !templateCode)) throw new BusinessError(ERROR_CODE.PARAM_MISSING, '参数不完整');
    const result = await smsService.sendNotification(phone, { scene, templateCode, params });
    if (!result.success) throw new BusinessError(ERROR_CODE.BAD_REQUEST, result.msg);
    return success(res, {}, result.msg);
  });
