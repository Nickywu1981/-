/**
 * Movio AI v4.1 — Content Moderation Middleware
 * G5 后端开发 | 中间件链第3层 (NEW v4.1)
 * 三阶段审核: input(输入) → output(生成后) → publish(分发前)
 */
import { ERROR_CODE } from '../constants/errorCode.js';
import logger from '../utils/logger.js';
import { error as sendError } from '../utils/response.js';
import { checkText } from '../services/sensitiveWordService.js';

export function contentModerationMiddleware(stage = 'input') {
  return async (req, res, next) => {
    const textValues = extractTextValues(req.body);
    if (!textValues.length) return next();

    const textToCheck = textValues.join(' ').substring(0, 2000);

    try {
      const found = await checkText(textToCheck);
      if (found && found.length > 0) {
        return sendError(res, ERROR_CODE.CONTENT_MODERATION, '内容包含违规信息，请修改后重试');
      }
    } catch (err) {
      logger.warn('[ContentModeration] 敏感词检查失败，拒绝放行', { error: err.message, stage });
      return sendError(res, ERROR_CODE.INTERNAL_ERROR, '内容审核服务暂不可用，请稍后重试');
    }

    // 记录审核请求到 content_audit_log
    req.auditRecord = {
      audit_stage: stage,
      content_type: 'text',
      original_text: textToCheck.substring(0, 1000),
      action: 'pass',
    };

    next();
  };
}

/** 递归提取对象中所有字符串值 */
function extractTextValues(obj, depth = 0) {
  if (depth > 5 || obj == null) return [];
  if (typeof obj === 'string') return [obj];
  if (Array.isArray(obj)) return obj.flatMap(v => extractTextValues(v, depth + 1));
  if (typeof obj === 'object') {
    return Object.values(obj).flatMap(v => extractTextValues(v, depth + 1));
  }
  return [];
}
