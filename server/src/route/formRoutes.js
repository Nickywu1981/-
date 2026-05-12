import { Router } from 'express';
import { authMiddleware, optionalAuth, adminAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate, idParamSchema, numericParamSchema } from '../utils/validate.js';
import { z } from 'zod';
import * as formController from '../controller/formController.js';

const router = Router();

const subIdParamSchema = numericParamSchema('subId');
const codeParamSchema = z.object({ code: z.string().min(1).max(50) });

// ── Zod 校验 ──
const createFormSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100),
  formCode: z.string().min(1, '编码不能为空').max(50).regex(/^[a-z0-9_-]+$/, '编码仅允许小写字母、数字、下划线、连字符'),
  description: z.string().optional(),
  fields: z.array(z.object({
    field_name: z.string().min(1).max(50).optional(),
    name: z.string().min(1).max(50).optional(),
    field_label: z.string().min(1).max(100).optional(),
    label: z.string().min(1).max(100).optional(),
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
    field_name: z.string().min(1).max(50),
    field_label: z.string().min(1).max(100),
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
router.get('/admin', authMiddleware, adminAuth, formController.listForms);
router.get('/admin/:id', authMiddleware, adminAuth, validate(idParamSchema, 'params'), formController.getFormById);
router.post('/admin', authMiddleware, adminAuth, validate(createFormSchema), formController.createForm);
router.put('/admin/:id', authMiddleware, adminAuth, validate(idParamSchema, 'params'), validate(updateFormSchema), formController.updateForm);
router.delete('/admin/:id', authMiddleware, adminAuth, validate(idParamSchema, 'params'), formController.deleteForm);

// 提交记录
router.get('/admin/:id/submissions', authMiddleware, adminAuth, validate(idParamSchema, 'params'), formController.listSubmissions);
router.get('/admin/:id/submissions/export', authMiddleware, adminAuth, validate(idParamSchema, 'params'), formController.exportSubmissions);
router.put('/admin/submissions/:subId', authMiddleware, adminAuth, validate(subIdParamSchema, 'params'), validate(updateSubmissionSchema), formController.updateSubmission);

// 字段管理
router.get('/admin/:id/fields', authMiddleware, adminAuth, validate(idParamSchema, 'params'), formController.listFields);
router.put('/admin/:id/fields', authMiddleware, adminAuth, validate(idParamSchema, 'params'), validate(upsertFieldsSchema), formController.upsertFields);

// ── 公开端（双端感知） ──
router.get('/public/:code', optionalAuth, validate(codeParamSchema, 'params'), formController.getPublicForm);
router.post('/public/:code', authLimiter, optionalAuth, validate(codeParamSchema, 'params'), validate(submitFormSchema), formController.submitForm);

export default router;
