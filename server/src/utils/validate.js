import { z } from 'zod';
import { error } from './response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { isProduction } from '../config/index.js';

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
      if (isProduction) {
        return error(res, ERROR_CODE.BAD_REQUEST, '参数校验失败');
      }
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
 */
export function validateV4(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source] || req.body;
    const result = schema.safeParse(data);
    if (!result.success) {
      if (isProduction) {
        return error(res, ERROR_CODE.VALIDATION_ERROR, '参数校验失败');
      }
      return error(res, ERROR_CODE.VALIDATION_ERROR, result.error.issues.map(e => e.message).join('; '));
    }
    if (source === 'body') {
      req.validated = result.data;
    } else {
      req[source] = result.data;
    }
    next();
  };
}

// ========== 常用校验 Schema ==========

/** 分页参数 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(999999).default(1),
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

/** URL params 动态数值校验（如 /:id） */
export const numericParamSchema = (name) => z.object({ [name]: z.string().regex(/^\d+$/).transform(Number) });
export const idParamSchema = numericParamSchema('id');
