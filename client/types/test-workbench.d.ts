/** Shared types for test-workbench components (ConfigPanel / ResultPanel / parent) */

export interface TestCategory {
  key: string
  label: string
  icon: string
}

export interface AvailableModel {
  key: string
  name: string
  category: string
  available: boolean
  state?: string
  failedCount?: number
}

export type ModelMap = Record<string, AvailableModel>

export type ModelsByCategoryFn = (cat: string) => AvailableModel[]

// ── Result types ──

export interface BaseResult {
  type: 'single' | 'mixed' | 'custom' | 'compare'
  duration_ms: number
  created_at: string
  error?: string
}

export interface ComparisonItem {
  model_key: string
  duration_ms: number
  success: boolean
  result?: unknown
  error?: string
}

export interface PipelineStep {
  order?: number
  model_key: string
  duration_ms?: number
  success: boolean
  result?: unknown
  error?: string
}

export interface SingleMixedResult extends BaseResult {
  type: 'single' | 'mixed'
  model_key?: string
  task_type?: string
  result?: unknown
}

export interface CompareResult extends BaseResult {
  type: 'compare'
  comparisons: ComparisonItem[]
}

export interface CustomResult extends BaseResult {
  type: 'custom'
  steps: PipelineStep[]
  result?: unknown
}

export type TestResult = SingleMixedResult | CompareResult | CustomResult
