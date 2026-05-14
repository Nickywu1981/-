// ── 页面配置校验 ──
// G4 Frontend-B | 运行时校验 PageConfig 完整性

import type { PageConfig, StepConfig, FieldConfig } from './types'

const VALID_FIELD_TYPES = new Set([
  'image-upload', 'video-upload', 'textarea', 'select', 'color-picker',
  'switch', 'style-chips', 'bg-grid', 'option-cards', 'prompt-enhancer',
  'slider', 'number',
])

const VALID_STEP_TYPES = new Set(['input', 'configure', 'progress', 'result'])

export interface ValidationError {
  path: string
  message: string
}

function validateField(field: FieldConfig, stepIdx: number, fieldIdx: number): ValidationError[] {
  const errs: ValidationError[] = []
  const base = `steps[${stepIdx}].fields[${fieldIdx}]`

  if (!field.type) errs.push({ path: base, message: 'field.type is required' })
  else if (!VALID_FIELD_TYPES.has(field.type)) errs.push({ path: base, message: `Unknown field type: ${field.type}` })

  if (!field.key) errs.push({ path: base, message: 'field.key is required' })
  if (!field.label) errs.push({ path: base, message: 'field.label is required' })

  // 选项类字段必须有 options
  const needsOptions = new Set(['select', 'style-chips', 'bg-grid', 'option-cards'])
  if (needsOptions.has(field.type) && (!field.options || field.options.length === 0)) {
    errs.push({ path: base, message: `field type "${field.type}" requires options` })
  }

  // 上传类字段必须有 upload 配置
  const needsUpload = new Set(['image-upload', 'video-upload'])
  if (needsUpload.has(field.type) && !field.upload) {
    errs.push({ path: base, message: `field type "${field.type}" requires upload config` })
  }

  return errs
}

function validateStep(step: StepConfig, idx: number): ValidationError[] {
  const errs: ValidationError[] = []
  const base = `steps[${idx}]`

  if (!step.type) errs.push({ path: base, message: 'step.type is required' })
  else if (!VALID_STEP_TYPES.has(step.type)) errs.push({ path: base, message: `Unknown step type: ${step.type}` })

  // 'input' 步骤必须有 fields；'configure' 允许空（用于纯触发页）
  if (step.type === 'input' && (!step.fields || step.fields.length === 0)) {
    errs.push({ path: base, message: 'input step requires at least one field' })
  }

  if (step.fields) {
    step.fields.forEach((f, fi) => { errs.push(...validateField(f, idx, fi)) })
  }

  return errs
}

/** 校验 PageConfig，返回错误列表（空数组 = 通过） */
export function validatePageConfig(config: PageConfig): ValidationError[] {
  const errs: ValidationError[] = []

  if (!config.id) errs.push({ path: 'id', message: 'config.id is required' })
  if (!config.title) errs.push({ path: 'title', message: 'config.title is required' })
  if (!config.steps || config.steps.length === 0) errs.push({ path: 'steps', message: 'At least one step is required' })
  if (!config.api) errs.push({ path: 'api', message: 'api config is required' })
  else if (!config.api.submitUrl) errs.push({ path: 'api.submitUrl', message: 'api.submitUrl is required' })
  if (!config.ui) errs.push({ path: 'ui', message: 'ui config is required' })
  else {
    if (!config.ui.stepLabels || config.ui.stepLabels.length === 0) errs.push({ path: 'ui.stepLabels', message: 'ui.stepLabels is required' })
    else if (config.ui.stepLabels.length !== config.steps.length) {
      errs.push({ path: 'ui.stepLabels', message: `stepLabels count (${config.ui.stepLabels.length}) != steps count (${config.steps.length})` })
    }
  }

  config.steps?.forEach((s, i) => { errs.push(...validateStep(s, i)) })

  return errs
}

/** 开发模式下校验并 warn */
export function assertValidConfig(config: PageConfig): void {
  const errs = validatePageConfig(config)
  if (errs.length > 0) {
    const msg = errs.map(e => `  ${e.path}: ${e.message}`).join('\n')
    console.warn(`[WorkPipeline] Config validation warnings for "${config.id}":\n${msg}`)
  }
}
