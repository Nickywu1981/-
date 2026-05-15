/**
 * Movio AI v4.3 — E2B Sandbox Controller
 * v4.2: 所有沙箱操作统一传递 userId，归属校验下沉至 service 层
 * v4.3: 监控埋点接入 + 错误响应标准化
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as e2bService from '../services/e2b.service.js';
import { recordCall } from '../services/monitorService.js';
import logger from '../utils/logger.js';

function _requireUserId(req) {
  const userId = req.user?.id;
  if (!userId) throw new BusinessError(ERROR_CODE.UNAUTHORIZED);
  return userId;
}

function _recordE2bCall({ userId, operation, status, latencyMs, sandboxId }) {
  setImmediate(() => {
    try {
      recordCall({
        modelId: `e2b-${operation}`,
        userId,
        status,
        tokensIn: 0,
        tokensOut: 0,
        cost: { amount: 0 },
        latencyMs,
      });
    } catch (e) {
      logger.warn('[E2B] 监控记录失败', { error: e.message, sandboxId });
    }
  });
}

export const createSandbox = wrapController(async (req, res) => {
  const userId = _requireUserId(req);
  const t0 = Date.now();
  let sandboxId;
  try {
    const result = await e2bService.createSandbox(userId);
    sandboxId = result.sandboxId;
    _recordE2bCall({ userId, operation: 'create', status: 'success', latencyMs: Date.now() - t0, sandboxId });
    return success(res, result, '沙箱创建成功');
  } catch (err) {
    _recordE2bCall({ userId, operation: 'create', status: 'error', latencyMs: Date.now() - t0 });
    throw err;
  }
});

export const executeCode = wrapController(async (req, res) => {
  const userId = _requireUserId(req);
  const { sandboxId } = req.params;
  const { code, language } = req.body;
  if (!code) throw new BusinessError(ERROR_CODE.VALIDATION_ERROR);
  const t0 = Date.now();
  try {
    const result = await e2bService.executeCode(sandboxId, userId, code, language);
    _recordE2bCall({ userId, operation: 'execute', status: 'success', latencyMs: Date.now() - t0, sandboxId });
    return success(res, result, '代码执行完成');
  } catch (err) {
    _recordE2bCall({ userId, operation: 'execute', status: 'error', latencyMs: Date.now() - t0, sandboxId });
    throw err;
  }
});

export const getSandbox = wrapController(async (req, res) => {
  const userId = _requireUserId(req);
  const { sandboxId } = req.params;
  const t0 = Date.now();
  const result = await e2bService.getSandbox(sandboxId, userId);
  _recordE2bCall({ userId, operation: 'get', status: 'success', latencyMs: Date.now() - t0, sandboxId });
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
  const t0 = Date.now();
  try {
    const result = await e2bService.destroySandbox(sandboxId, userId);
    _recordE2bCall({ userId, operation: 'destroy', status: 'success', latencyMs: Date.now() - t0, sandboxId });
    return success(res, result, '沙箱已销毁');
  } catch (err) {
    _recordE2bCall({ userId, operation: 'destroy', status: 'error', latencyMs: Date.now() - t0, sandboxId });
    throw err;
  }
});
