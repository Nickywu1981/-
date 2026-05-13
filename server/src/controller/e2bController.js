/**
 * Movio AI v4.1 — E2B Sandbox Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as e2bService from '../services/e2b.service.js';

export const createSandbox = wrapController(async (req, res) => {
  const userId = req.user?.id || 0;
  const result = await e2bService.createSandbox(userId);
  return success(res, result, '沙箱创建成功');
});

export const executeCode = wrapController(async (req, res) => {
  const { sandboxId } = req.params;
  const { code, language } = req.body;
  if (!code) throw new BusinessError(ERROR_CODE.VALIDATION_ERROR, '请提供代码内容');
  const result = await e2bService.executeCode(sandboxId, code, language);
  return success(res, result, '代码执行完成');
});

export const getSandbox = wrapController(async (req, res) => {
  const { sandboxId } = req.params;
  const result = await e2bService.getSandbox(sandboxId);
  return success(res, result);
});

export const listSandboxes = wrapController(async (req, res) => {
  const userId = req.user?.id || 0;
  const result = await e2bService.listUserSandboxes(userId);
  return success(res, result);
});

export const destroySandbox = wrapController(async (req, res) => {
  const { sandboxId } = req.params;
  const result = await e2bService.destroySandbox(sandboxId);
  return success(res, result, '沙箱已销毁');
});
