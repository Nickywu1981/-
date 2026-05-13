/**
 * Movio AI v4.2 — E2B Sandbox Controller
 * v4.2: 所有沙箱操作统一传递 userId，归属校验下沉至 service 层
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as e2bService from '../services/e2b.service.js';

function _requireUserId(req) {
  const userId = req.user?.id;
  if (!userId) throw new BusinessError(ERROR_CODE.UNAUTHORIZED, '请先登录');
  return userId;
}

export const createSandbox = wrapController(async (req, res) => {
  const userId = _requireUserId(req);
  const result = await e2bService.createSandbox(userId);
  return success(res, result, '沙箱创建成功');
});

export const executeCode = wrapController(async (req, res) => {
  const userId = _requireUserId(req);
  const { sandboxId } = req.params;
  const { code, language } = req.body;
  if (!code) throw new BusinessError(ERROR_CODE.VALIDATION_ERROR, '请提供代码内容');
  const result = await e2bService.executeCode(sandboxId, userId, code, language);
  return success(res, result, '代码执行完成');
});

export const getSandbox = wrapController(async (req, res) => {
  const userId = _requireUserId(req);
  const { sandboxId } = req.params;
  const result = await e2bService.getSandbox(sandboxId, userId);
  return success(res, result);
});

export const listSandboxes = wrapController(async (req, res) => {
  const userId = _requireUserId(req);
  const result = await e2bService.listUserSandboxes(userId);
  return success(res, result);
});

export const destroySandbox = wrapController(async (req, res) => {
  const userId = _requireUserId(req);
  const { sandboxId } = req.params;
  const result = await e2bService.destroySandbox(sandboxId, userId);
  return success(res, result, '沙箱已销毁');
});
