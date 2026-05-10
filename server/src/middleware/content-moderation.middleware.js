/**
 * Movio AI v4.1 — Content Moderation Middleware
 * G5 后端开发 | 中间件链第3层 (NEW v4.1)
 * 三阶段审核: input(输入) → output(生成后) → publish(分发前)
 */
import { error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// 敏感词临时列表 (W1用，后续接入通义千问 moderation API)
const BLOCKED_WORDS = [
  // W1 MVP: 留空，接入阿里云/通义 moderation API 后替换
  // 正式版由 moderation.service 调用外部审核API
];

export function contentModerationMiddleware(stage = 'input') {
  return async (req, _res, next) => {
    // W1 MVP: 基础敏感词过滤，后续接入 T-G5-005 moderation.service
    const textToCheck = req.body?.prompt || req.body?.text || req.body?.content || '';

    if (!textToCheck) return next();

    const lower = textToCheck.toLowerCase();
    for (const word of BLOCKED_WORDS) {
      if (lower.includes(word.toLowerCase())) {
        return res.status(422).json({ code: ERROR_CODE.CONTENT_MODERATION, msg: '内容包含违规信息，请修改后重试' });
      }
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
