import { Router } from 'express';
import { authMiddleware, optionalAuth, adminAuth } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import * as formController from '../controller/formController.js';

const router = Router();

const numericParam = (name) => z.object({ [name]: z.string().regex(/^\d+$/).transform(Number) });
const idParamSchema = numericParam('id');
const subIdParamSchema = numericParam('subId');
const codeParamSchema = z.object({ code: z.string().min(1).max(50) });

// ── Zod 校验 ──
const createFormSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100),
  formCode: z.string().min(1, '编码不能为空').max(50).regex(/^[a-z0-9_-]+$/, '编码仅允许小写字母、数字、下划线、连字符'),
  description: z.string().optional(),
  fields: z.array(z.object({
    field_name: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    field_label: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
    field_type: z.enum(['text','textarea','select','radio','checkbox','date','file','email','phone','number','cascade']).optional(),
    type: z.enum(['text','textarea','select','radio','checkbox','date','file','email','phone','number','cascade']).optional(),
    is_required: z.boolean().optional(),
    required: z.boolean().optional(),
    validation_rules: z.array(z.object({ rule: z.string(), value: z.unknown().optional(), message: z.string().optional() })).optional(),
    linkage_conditions: z.array(z.object({ targetField: z.string(), operator: z.string(), value: z.unknown().optional() })).optional(),
    masking_rule: z.enum(['phone','email','idcard','name','custom']).optional(),
  })).optional(),
  accessType: z.number().min(1).max(3).optional(),
  submitLimit: z.number().min(0).optional(),
  maxSubmissionsPerUser: z.number().min(0).optional(),
});

const submitFormSchema = z.object({
  fields: z.record(z.unknown()).refine(v => Object.keys(v).length > 0, '至少填写一个字段'),
});

const upsertFieldsSchema = z.object({
  fields: z.array(z.object({
    field_name: z.string().min(1),
    field_label: z.string().min(1),
    field_type: z.enum(['text','textarea','select','radio','checkbox','date','file','email','phone','number','cascade']),
  })).min(1),
});

const updateFormSchema = createFormSchema.partial().omit({ formCode: true });

const updateSubmissionSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'spam']).optional(),
  data_status: z.enum(['valid', 'invalid', 'duplicate']).optional(),
  remark: z.string().max(500).optional(),
});

// ── 管理端 ──
router.get('/admin', authMiddleware, adminAuth, asyncHandler(formController.listForms));
router.get('/admin/:id', authMiddleware, adminAuth, validate(idParamSchema, 'params'), asyncHandler(formController.getFormById));
router.post('/admin', authMiddleware, adminAuth, validate(createFormSchema), asyncHandler(formController.createForm));
router.put('/admin/:id', authMiddleware, adminAuth, validate(idParamSchema, 'params'), validate(updateFormSchema), asyncHandler(formController.updateForm));
router.delete('/admin/:id', authMiddleware, adminAuth, validate(idParamSchema, 'params'), asyncHandler(formController.deleteForm));

// 提交记录
router.get('/admin/:id/submissions', authMiddleware, adminAuth, validate(idParamSchema, 'params'), asyncHandler(formController.listSubmissions));
router.get('/admin/:id/submissions/export', authMiddleware, adminAuth, validate(idParamSchema, 'params'), asyncHandler(formController.exportSubmissions));
router.put('/admin/submissions/:subId', authMiddleware, adminAuth, validate(subIdParamSchema, 'params'), validate(updateSubmissionSchema), asyncHandler(formController.updateSubmission));

// 字段管理
router.get('/admin/:id/fields', authMiddleware, adminAuth, validate(idParamSchema, 'params'), asyncHandler(formController.listFields));
router.put('/admin/:id/fields', authMiddleware, adminAuth, validate(idParamSchema, 'params'), validate(upsertFieldsSchema), asyncHandler(formController.upsertFields));

// ── 公开端（双端感知） ──
router.get('/public/:code', optionalAuth, validate(codeParamSchema, 'params'), asyncHandler(formController.getPublicForm));
router.post('/public/:code', apiLimiter, optionalAuth, validate(codeParamSchema, 'params'), validate(submitFormSchema), asyncHandler(formController.submitForm));

export default router;
