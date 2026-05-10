import { wrapController } from '../utils/wrapController.js';
import * as smsService from '../services/smsService.js';
import { success, listResult, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 发送验证码（公开） ====================

export const sendVerificationCode = wrapController(async (req, res, next) => {
    const { phone, scene } = req.body;
    if (!phone || !scene) return error(res, ERROR_CODE.PARAM_MISSING, '手机号和场景不能为空');
    if (!['register', 'login', 'reset_password', 'bind'].includes(scene)) {
      return error(res, ERROR_CODE.PARAM_INVALID, '不支持的短信场景');
    }
    const result = await smsService.sendVerificationCode({ phone, scene });
    if (!result.success) return error(res, ERROR_CODE.BAD_REQUEST, result.msg);
    return success(res, { expire: result.expire }, result.msg);
  } catch (err) { next(err); }
}

// ==================== 校验验证码（公开） ====================

export const verifyCode = wrapController(async (req, res, next) => {
    const { phone, scene, code } = req.body;
    if (!phone || !scene || !code) return error(res, ERROR_CODE.PARAM_MISSING, '参数不完整');
    const result = smsService.verifyCode(phone, scene, code);
    if (!result.valid) return error(res, ERROR_CODE.BAD_REQUEST, result.reason);
    return success(res, {}, '验证通过');
  } catch (err) { next(err); }
}

// ==================== 模板管理（后台） ====================

export const listTemplates = wrapController(async (_req, res, next) => {
    const data = await smsService.getTemplates();
    return success(res, data);
  } catch (err) { next(err); }
}

export const updateTemplate = wrapController(async (req, res, next) => {
    const data = await smsService.updateTemplate(req.params.id, req.body);
    return success(res, data, '短信模板已更新');
  } catch (err) { next(err); }
}

export const createTemplate = wrapController(async (req, res, next) => {
    const id = await smsService.createTemplate(req.body);
    return success(res, { id }, '短信模板已创建');
  } catch (err) { next(err); }
}

export const deleteTemplate = wrapController(async (req, res, next) => {
    await smsService.deleteTemplate(req.params.id);
    return success(res, {}, '短信模板已删除');
  } catch (err) { next(err); }
}

// ==================== 发送日志（后台） ====================

export const listLogs = wrapController(async (req, res, next) => {
    const { page, pageSize } = parsePagination(req.query, { defaultPageSize: 30 });
    const { phone, result, startDate, endDate } = req.query;
    const data = await smsService.getLogs({ page, pageSize, phone, result, startDate, endDate });
    return listResult(res, data);
  } catch (err) { next(err); }
}

// ==================== 通知类发送（内部调用/后台手动触发） ====================

export const sendNotification = wrapController(async (req, res, next) => {
    const { phone, scene, templateCode, params } = req.body;
    if (!phone || (!scene && !templateCode)) return error(res, ERROR_CODE.PARAM_MISSING, '参数不完整');
    const result = await smsService.sendNotification(phone, { scene, templateCode, params });
    if (!result.success) return error(res, ERROR_CODE.BAD_REQUEST, result.msg);
    return success(res, {}, result.msg);
  } catch (err) { next(err); }
}
