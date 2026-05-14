// ── 组件注册表 ──
// G4 Frontend-B | 注册 field type → 渲染组件映射

import type { FieldConfig, FieldOption } from './types'

/** 字段渲染器 Props */
export interface FieldRendererProps {
  field: FieldConfig
  modelValue: unknown
  error?: string
}

/** 字段渲染器：接收 field 配置 + v-model 值，渲染对应控件 */
export type FieldRenderer = new () => {
  $props: FieldRendererProps & { options?: FieldOption[] }
}

/** 注册表：field type → 渲染逻辑描述 */
const registry = new Map<string, { component: string; propsMapper: (field: FieldConfig, value: unknown) => Record<string, unknown> }>()

// ── 内置注册 ──

registry.set('image-upload', {
  component: 'PipelineUpload',
  propsMapper: (field, value) => ({
    accept: field.upload?.accept ?? 'image/*',
    maxSizeMB: field.upload?.maxSizeMB ?? 20,
    multiple: field.upload?.multiple ?? false,
    maxCount: field.upload?.maxCount ?? 1,
    label: field.label,
    hint: field.hint,
  }),
})

registry.set('video-upload', {
  component: 'PipelineUpload',
  propsMapper: (field, value) => ({
    accept: field.upload?.accept ?? 'video/*',
    maxSizeMB: field.upload?.maxSizeMB ?? 200,
    multiple: field.upload?.multiple ?? false,
    maxCount: field.upload?.maxCount ?? 1,
    label: field.label,
    hint: field.hint,
  }),
})

registry.set('textarea', {
  component: 'PipelineTextarea',
  propsMapper: (field, value) => ({
    label: field.label,
    placeholder: field.placeholder,
    maxLength: field.validation?.maxLength ?? 5000,
    rows: 4,
    modelValue: value,
  }),
})

registry.set('select', {
  component: 'PipelineSelect',
  propsMapper: (field, value) => ({
    label: field.label,
    options: field.options ?? [],
    modelValue: value ?? field.default,
  }),
})

registry.set('color-picker', {
  component: 'PipelineColorPicker',
  propsMapper: (field, _value) => ({
    label: field.label,
    modelValue: _value ?? field.default ?? '#000000',
  }),
})

registry.set('style-chips', {
  component: 'PipelineStyleChips',
  propsMapper: (field, value) => ({
    label: field.label,
    options: field.options ?? [],
    modelValue: value ?? field.default,
  }),
})

registry.set('bg-grid', {
  component: 'PipelineBgGrid',
  propsMapper: (field, value) => ({
    label: field.label,
    options: field.options ?? [],
    modelValue: value ?? field.default,
  }),
})

registry.set('option-cards', {
  component: 'PipelineOptionCards',
  propsMapper: (field, value) => ({
    label: field.label,
    options: field.options ?? [],
    modelValue: value ?? field.default,
  }),
})

registry.set('prompt-enhancer', {
  component: 'PipelinePromptEnhancer',
  propsMapper: (field, value) => ({
    label: field.label,
    placeholder: field.placeholder,
    modelValue: value ?? '',
  }),
})

registry.set('switch', {
  component: 'PipelineSwitch',
  propsMapper: (field, value) => ({
    label: field.label,
    modelValue: value ?? field.default ?? false,
  }),
})

registry.set('slider', {
  component: 'PipelineSlider',
  propsMapper: (field, value) => ({
    label: field.label,
    min: field.validation?.min ?? 0,
    max: field.validation?.max ?? 100,
    modelValue: value ?? field.default ?? 50,
  }),
})

registry.set('number', {
  component: 'PipelineNumber',
  propsMapper: (field, value) => ({
    label: field.label,
    min: field.validation?.min,
    max: field.validation?.max,
    modelValue: value ?? field.default ?? 0,
  }),
})

/** 获取字段对应的渲染组件名 */
export function getFieldRenderer(type: FieldConfig['type']): { component: string; propsMapper: (field: FieldConfig, value: unknown) => Record<string, unknown> } | undefined {
  return registry.get(type)
}

/** 注册自定义字段类型（扩展用） */
export function registerFieldType(
  type: string,
  component: string,
  propsMapper: (field: FieldConfig, value: unknown) => Record<string, unknown>,
): void {
  registry.set(type, { component, propsMapper })
}

/** 检查字段类型是否已注册 */
export function hasFieldType(type: string): boolean {
  return registry.has(type)
}
