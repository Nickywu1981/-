import { Router } from 'express';
import { authMiddleware, optionalAuth, adminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import * as formController from '../controller/formController.js';

const router = Router();

const createFormSchema = z.object({
  name: z.string().min(1, '表单名称不能为空').max(100),
  code: z.string().min(1, '表单编码不能为空').max(50).regex(/^[a-z0-9_-]+$/, '编码仅允许小写字母、数字、下划线、连字符'),
  fields: z.array(z.object({
    label: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(['text', 'textarea', 'select', 'radio', 'checkbox', 'date', 'file', 'email', 'phone', 'number']),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),
    placeholder: z.string().optional(),
  })).min(1, '至少需要一个字段'),
});
const submitFormSchema = z.object({
  fields: z.record(z.any()).refine(v => Object.keys(v).length > 0, '至少填写一个字段'),
});

router.get('/', optionalAuth, asyncHandler(formController.listForms));
router.get('/admin', authMiddleware, adminAuth, asyncHandler(formController.listForms));
router.get('/admin/:id', authMiddleware, adminAuth, asyncHandler(formController.getFormById));
router.post('/admin', authMiddleware, adminAuth, validate(createFormSchema), asyncHandler(formController.createForm));
router.put('/admin/:id', authMiddleware, adminAuth, asyncHandler(formController.updateForm));
router.delete('/admin/:id', authMiddleware, adminAuth, asyncHandler(formController.deleteForm));
router.get('/admin/:id/submissions', authMiddleware, adminAuth, asyncHandler(formController.listSubmissions));
router.put('/admin/submissions/:subId', authMiddleware, adminAuth, asyncHandler(formController.updateSubmission));
router.get('/public/:code', optionalAuth, asyncHandler(formController.getPublicForm));
router.post('/public/:code', optionalAuth, validate(submitFormSchema), asyncHandler(formController.submitForm));

export default router;
