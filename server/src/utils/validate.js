import { z } from 'zod';
import { error } from './response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

/**
 * 通用 Zod 校验中间件工厂
 * @param {z.ZodSchema} schema - Zod schema
 * @param {'body'|'query'|'params'} source - 校验来源
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const result = schema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return error(res, ERROR_CODE.BAD_REQUEST, '参数校验失败', { errors });
    }
    req[source] = result.data;
    next();
  };
}

/**
 * v4 校验中间件 — 结果存入 req.validated，不覆盖 req.body
 * 用于 v4 路由的统一 safeParse + 标准化错误响应
 */
export function validateV4(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return error(res, ERROR_CODE.VALIDATION_ERROR, result.error.issues.map(e => e.message).join('; '));
    }
    req.validated = result.data;
    next();
  };
}

// ========== 常用校验 Schema ==========

/** 分页参数 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/** 手机号 */
export const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确');

/** 邮箱 */
export const emailSchema = z.string().email('邮箱格式不正确').max(254, '邮箱地址过长');

/** 验证码 */
export const codeSchema = z.string().length(6, '验证码为6位数字').regex(/^\d{6}$/, '验证码为6位数字');

/** 密码 */
export const passwordSchema = z.string().min(8, '密码至少8位').max(32, '密码最多32位');

/** ID */
export const idSchema = z.coerce.number().int().positive('ID必须为正整数');

export default { validate, paginationSchema, phoneSchema, emailSchema, codeSchema, passwordSchema, idSchema };
