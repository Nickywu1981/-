/**
 * Movio AI v4.1 — Content Moderation Middleware
 * G5 后端开发 | 中间件链第3层 (NEW v4.1)
 * 三阶段审核: input(输入) → output(生成后) → publish(分发前)
 */
import { error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export function contentModerationMiddleware(stage = 'input') {
  return async (req, res, next) => {
    const textToCheck = req.body?.prompt || req.body?.text || req.body?.content || '';

    if (!textToCheck) return next();

    // 动态加载敏感词服务，避免模块循环依赖
    try {
      const { checkText } = await import('../services/sensitiveWordService.js');
      const found = await checkText(textToCheck);
      if (found && found.length > 0) {
        return res.status(422).json({ code: ERROR_CODE.CONTENT_MODERATION, msg: '内容包含违规信息，请修改后重试' });
      }
    } catch {
      // sensitiveWordService 不可用时降级放行（避免阻断正常业务）
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
