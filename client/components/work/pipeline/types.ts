// ── WorkPipeline 核心类型定义 ──
// G1 Architect | 组件注册表 + Schema 规范

/** 单个字段配置 */
export interface FieldConfig {
  /** 字段类型，决定渲染器 */
  type:
    | 'image-upload'      // 图片上传（拖拽+预览+上传API）
    | 'video-upload'      // 视频上传
    | 'textarea'          // 多行文本
    | 'select'            // 下拉选择
    | 'color-picker'      // 颜色选择器
    | 'switch'            // 开关
    | 'style-chips'       // 风格卡片选择（图标+名称）
    | 'bg-grid'           // 背景网格选择（预览色块+名称）
    | 'option-cards'      // 通用选项卡片
    | 'prompt-enhancer'   // 提示词增强器
    | 'slider'            // 滑块
    | 'number'            // 数字输入
  /** 字段唯一标识，对应 API 参数名 */
  key: string
  /** 显示标签 i18n key */
  label: string
  /** 是否必填 */
  required?: boolean
  /** 默认值 */
  default?: unknown
  /** 占位文本 i18n key */
  placeholder?: string
  /** 提示文本 i18n key */
  hint?: string
  /** 选项列表（select / style-chips / bg-grid / option-cards 使用） */
  options?: FieldOption[]
  /** 校验规则 */
  validation?: FieldValidation
  /** 上传配置 */
  upload?: UploadConfig
  /** 可见条件：依赖字段有值时显示 */
  showWhen?: { field: string; notEmpty?: boolean }
}

export interface FieldOption {
  label: string
  value: string
  icon?: string
  css?: string        // bg-grid 使用：CSS 背景值
  badge?: string       // 角标文本
}

export interface FieldValidation {
  min?: number
  max?: number
  maxLength?: number
  pattern?: string
  acceptedTypes?: string[]
}

export interface UploadConfig {
  accept: 'image/*' | 'video/*' | 'audio/*'
  maxSizeMB?: number
  maxCount?: number
  multiple?: boolean
}

/** 单个步骤配置 */
export interface StepConfig {
  /** 步骤类型 */
  type: 'input' | 'configure' | 'progress' | 'result'
  /** 步骤标题 i18n key */
  title?: string
  /** 该步骤包含的字段 */
  fields?: FieldConfig[]
}

/** API 配置 */
export interface ApiConfig {
  /** 提交任务的 API 路径 */
  submitUrl: string
  /** 提交方法 */
  submitMethod?: 'GET' | 'POST' | 'PUT'
  /** 轮询任务状态的 API 路径模板，{taskId} 会被替换 */
  pollUrlTemplate?: string
  /** 轮询间隔 (ms) */
  pollIntervalMs?: number
  /** 是否使用 FormData 提交 */
  formData?: boolean
  /** 文件字段名（formData 模式） */
  fileFieldName?: string
  /** 成本消耗点数 */
  cost?: number
}

/** UI 配置 */
export interface UiConfig {
  /** 步骤标签 i18n keys */
  stepLabels: string[]
  /** 上传区图标 emoji */
  uploadIcon?: string
  /** 结果展示模式 */
  resultMode?: 'single-image' | 'image-grid' | 'before-after' | 'video' | 'text' | 'download'
  /** 可自定义的 UI 文本 */
  labels?: {
    selectFile?: string        // "选择文件" 按钮
    nextStep?: string          // "下一步" 按钮
    startTask?: string         // "开始生成" 按钮
    processing?: string        // 处理中
    queued?: string            // 排队中
    resultTitle?: string       // 结果标题
    uploadHint?: string        // 上传空状态提示
    originalLabel?: string     // 原图标签 (before-after 模式)
    afterLabel?: string        // 结果图标签 (before-after 模式)
    download?: string          // "下载" 按钮
    redo?: string              // "重新生成" 按钮
    failedUpload?: string      // 上传失败
    failedTask?: string        // 任务失败
    failedProcess?: string     // 处理失败
    missingRequired?: string   // 必填项提示
    success?: string           // 操作成功
  }
}

/** 一个工作台页面的完整配置 */
export interface PageConfig {
  /** 页面唯一标识，对应路由名 */
  id: string
  /** 页面标题 i18n key */
  title: string
  /** 副标题 i18n key */
  subtitle?: string
  /** 步骤配置 */
  steps: StepConfig[]
  /** API 配置 */
  api: ApiConfig
  /** UI 配置 */
  ui: UiConfig
}

/** 管线运行时状态 */
export interface PipelineState {
  currentStep: number
  taskStatus: -1 | 0 | 1 | 2 | 3  // -1=idle, 0=queued, 1=processing, 2=done, 3=error
  progress: number
  progressMsg: string
  errorMsg: string
  fieldValues: Record<string, unknown>
  uploads: Record<string, { previewUrl: string; uploadedUrl: string; uploading: boolean; error: string }>
  result: unknown
}
