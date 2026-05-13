/**
 * 电商全场景 — 7套统一工作流定义
 *
 * 统一架构规则:
 *   1. 每条工作流步骤顺序固定不变 (保证爆款逻辑)
 *   2. 每一步独立绑定模型 (支持 auto 智能选择 或 手动指定)
 *   3. 步骤可开关 (enabled: true/false)
 *   4. 可增删1-2个节点 (通过 extraSteps 扩展)
 *   5. 双运行模式: auto(系统自动选最优模型) | custom(手动指定每步模型)
 *
 * 模型类别:
 *   image  — 文生图
 *   video  — 文生视频
 *   text   — 大语言模型
 *   voice  — 语音合成
 *   audio  — 音频处理
 */

export const WORKFLOW_DEFINITIONS = {

  // ==================== 工作流1: 白底图全能生成 (核心爆款) ====================
  white_bg_full: {
    id: 'white_bg_full',
    name: '白底图全能生成',
    description: '白底图→扩图→详情页→脚本→分镜→视频→配音→BGM→打包 全链路爆款工作流',
    category: 'image',
    icon: 'white-bg',
    // 强制规则：禁止跳过脚本分镜直接生成视频
    forceVideoRule: true,
    steps: [
      { order: 1,  key: 'intent_classify',    label: '意图识别',          category: 'text',  taskType: 'intent',       enabled: true, required: true,  allowModel: true,  timeout: 30_000 },
      { order: 2,  key: 'compliance_check',   label: '合规校验',          category: 'text',  taskType: 'compliance',   enabled: true, required: true,  allowModel: false, timeout: 10_000 },
      { order: 3,  key: 'prompt_wrap',        label: '提示词封装',        category: 'text',  taskType: 'prompt_wrap',  enabled: true, required: true,  allowModel: false, timeout: 10_000 },
      { order: 4,  key: 'white_bg_gen',       label: '白底图生成',        category: 'image', taskType: 'white_bg',     enabled: true, required: true,  allowModel: true,  timeout: 60_000 },
      { order: 5,  key: 'multi_angle_gen',    label: '多角度主图',        category: 'image', taskType: 'multi_angle',  enabled: true, required: false, allowModel: true,  timeout: 120_000 },
      { order: 6,  key: 'scene_image_gen',    label: '场景图生成',        category: 'image', taskType: 'scene_image',  enabled: true, required: false, allowModel: true,  timeout: 120_000 },
      { order: 7,  key: 'detail_shot_gen',    label: '卖点细节图',        category: 'image', taskType: 'detail_shot',  enabled: true, required: false, allowModel: true,  timeout: 120_000 },
      { order: 8,  key: 'detail_page_gen',    label: '详情页图文',        category: 'text',  taskType: 'detail_page',  enabled: true, required: false, allowModel: true,  timeout: 180_000 },
      { order: 9,  key: 'script_gen',         label: '带货脚本生成',      category: 'text',  taskType: 'script',       enabled: true, required: true,  allowModel: true,  timeout: 60_000 },
      { order: 10, key: 'storyboard_gen',     label: '分镜图生成',        category: 'image', taskType: 'storyboard',   enabled: true, required: true,  allowModel: true,  timeout: 300_000 },
      { order: 11, key: 'video_compose',      label: '视频合成',          category: 'video', taskType: 'video_compose',enabled: true, required: true,  allowModel: true,  timeout: 300_000 },
      { order: 12, key: 'voice_dub',          label: '配音字幕',          category: 'voice', taskType: 'tts',          enabled: true, required: false, allowModel: true,  timeout: 60_000 },
      { order: 13, key: 'bgm_add',            label: 'BGM配乐',          category: 'audio', taskType: 'bgm',          enabled: false,required: false, allowModel: true,  timeout: 30_000 },
      { order: 14, key: 'pack_export',        label: '素材打包输出',      category: 'text',  taskType: 'export',       enabled: true, required: true,  allowModel: false, timeout: 30_000 },
    ],
  },

  // ==================== 工作流2: 批量图片扩图 ====================
  batch_image_expand: {
    id: 'batch_image_expand',
    name: '批量图片扩图',
    description: '产品图→批量生成主图/多角度图/场景图/分镜图→尺寸标准化→输出',
    category: 'image',
    steps: [
      { order: 1, key: 'intent_classify',     label: '意图识别',          category: 'text',  taskType: 'intent',       enabled: true, required: true,  allowModel: true,  timeout: 30_000 },
      { order: 2, key: 'compliance_check',    label: '合规校验',          category: 'text',  taskType: 'compliance',   enabled: true, required: true,  allowModel: false, timeout: 10_000 },
      { order: 3, key: 'prompt_wrap',         label: '提示词封装',        category: 'text',  taskType: 'prompt_wrap',  enabled: true, required: true,  allowModel: false, timeout: 10_000 },
      { order: 4, key: 'multi_angle_gen',     label: '多角度主图',        category: 'image', taskType: 'multi_angle',  enabled: true, required: true,  allowModel: true,  timeout: 120_000 },
      { order: 5, key: 'scene_image_gen',     label: '场景图生成',        category: 'image', taskType: 'scene_image',  enabled: true, required: false, allowModel: true,  timeout: 120_000 },
      { order: 6, key: 'detail_shot_gen',     label: '卖点细节图',        category: 'image', taskType: 'detail_shot',  enabled: false,required: false, allowModel: true,  timeout: 120_000 },
      { order: 7, key: 'storyboard_gen',      label: '分镜图生成',        category: 'image', taskType: 'storyboard',   enabled: false,required: false, allowModel: true,  timeout: 300_000 },
      { order: 8, key: 'size_standardize',    label: '尺寸标准化',        category: 'image', taskType: 'resize',       enabled: true, required: true,  allowModel: false, timeout: 30_000 },
      { order: 9, key: 'pack_export',         label: '打包输出',          category: 'text',  taskType: 'export',       enabled: true, required: true,  allowModel: false, timeout: 30_000 },
    ],
  },

  // ==================== 工作流3: 详情页全套生成 ====================
  detail_page_full: {
    id: 'detail_page_full',
    name: '详情页全套生成',
    description: '产品图→文案→模块图→自动排版→输出',
    category: 'detail',
    steps: [
      { order: 1, key: 'intent_classify',     label: '意图识别',          category: 'text',  taskType: 'intent',       enabled: true, required: true,  allowModel: true,  timeout: 30_000 },
      { order: 2, key: 'compliance_check',    label: '合规校验',          category: 'text',  taskType: 'compliance',   enabled: true, required: true,  allowModel: false, timeout: 10_000 },
      { order: 3, key: 'prompt_wrap',         label: '提示词封装',        category: 'text',  taskType: 'prompt_wrap',  enabled: true, required: true,  allowModel: false, timeout: 10_000 },
      { order: 4, key: 'detail_copy_gen',     label: '详情文案生成',      category: 'text',  taskType: 'detail_copy',  enabled: true, required: true,  allowModel: true,  timeout: 60_000 },
      { order: 5, key: 'detail_module_gen',   label: '详情模块图生成',    category: 'image', taskType: 'detail_module',enabled: true, required: true,  allowModel: true,  timeout: 300_000 },
      { order: 6, key: 'selling_points_gen',  label: '卖点提炼',          category: 'text',  taskType: 'selling_points',enabled:true,required: true,  allowModel: true,  timeout: 30_000 },
      { order: 7, key: 'auto_layout',         label: '自动排版',          category: 'text',  taskType: 'layout',       enabled: true, required: true,  allowModel: false, timeout: 10_000 },
      { order: 8, key: 'pack_export',         label: '打包输出',          category: 'text',  taskType: 'export',       enabled: true, required: true,  allowModel: false, timeout: 30_000 },
    ],
  },

  // ==================== 工作流4: 文案&脚本生成 ====================
  copywriting_script: {
    id: 'copywriting_script',
    name: '文案&脚本生成',
    description: '需求/产品图→文案/脚本→精炼规整→输出',
    category: 'text',
    steps: [
      { order: 1, key: 'intent_classify',     label: '意图识别',          category: 'text',  taskType: 'intent',       enabled: true, required: true,  allowModel: true,  timeout: 30_000 },
      { order: 2, key: 'compliance_check',    label: '合规校验',          category: 'text',  taskType: 'compliance',   enabled: true, required: true,  allowModel: false, timeout: 10_000 },
      { order: 3, key: 'prompt_wrap',         label: '提示词封装',        category: 'text',  taskType: 'prompt_wrap',  enabled: true, required: true,  allowModel: false, timeout: 10_000 },
      { order: 4, key: 'copywriting_gen',     label: '营销文案生成',      category: 'text',  taskType: 'copywriting',  enabled: true, required: false, allowModel: true,  timeout: 60_000 },
      { order: 5, key: 'script_gen',          label: '带货脚本生成',      category: 'text',  taskType: 'script',       enabled: true, required: false, allowModel: true,  timeout: 60_000 },
      { order: 6, key: 'selling_points_gen',  label: '卖点提炼',          category: 'text',  taskType: 'selling_points',enabled:true,required: false, allowModel: true,  timeout: 30_000 },
      { order: 7, key: 'script_polish',       label: '精炼规整',          category: 'text',  taskType: 'polish',       enabled: true, required: true,  allowModel: true,  timeout: 30_000 },
      { order: 8, key: 'pack_export',         label: '输出',              category: 'text',  taskType: 'export',       enabled: true, required: true,  allowModel: false, timeout: 10_000 },
    ],
  },

  // ==================== 工作流5: 普通视频生成 ====================
  video_generation: {
    id: 'video_generation',
    name: '视频生成',
    description: '素材→分镜→视频合成→字幕配音→输出 (禁止一键直出视频)',
    category: 'video',
    forceVideoRule: true,
    steps: [
      { order: 1, key: 'intent_classify',     label: '意图识别',          category: 'text',  taskType: 'intent',       enabled: true, required: true,  allowModel: true,  timeout: 30_000 },
      { order: 2, key: 'compliance_check',    label: '合规校验',          category: 'text',  taskType: 'compliance',   enabled: true, required: true,  allowModel: false, timeout: 10_000 },
      { order: 3, key: 'prompt_wrap',         label: '提示词封装',        category: 'text',  taskType: 'prompt_wrap',  enabled: true, required: true,  allowModel: false, timeout: 10_000 },
      { order: 4, key: 'script_gen',          label: '脚本生成',          category: 'text',  taskType: 'script',       enabled: true, required: true,  allowModel: true,  timeout: 60_000 },
      { order: 5, key: 'storyboard_gen',      label: '分镜图生成',        category: 'image', taskType: 'storyboard',   enabled: true, required: true,  allowModel: true,  timeout: 300_000 },
      { order: 6, key: 'video_compose',       label: '视频合成',          category: 'video', taskType: 'video_compose',enabled: true, required: true,  allowModel: true,  timeout: 300_000 },
      { order: 7, key: 'voice_dub',           label: '字幕配音',          category: 'voice', taskType: 'tts',          enabled: true, required: false, allowModel: true,  timeout: 60_000 },
      { order: 8, key: 'bgm_add',             label: 'BGM配乐',          category: 'audio', taskType: 'bgm',          enabled: false,required: false, allowModel: true,  timeout: 30_000 },
      { order: 9, key: 'pack_export',         label: '输出',              category: 'text',  taskType: 'export',       enabled: true, required: true,  allowModel: false, timeout: 30_000 },
    ],
  },

  // ==================== 工作流6: 爆款视频复刻 ====================
  viral_clone: {
    id: 'viral_clone',
    name: '爆款视频复刻',
    description: '爆款视频→反推拆解→脚本分镜→画面→合成投流视频→配音',
    category: 'video',
    forceVideoRule: true,
    steps: [
      { order: 1, key: 'intent_classify',     label: '意图识别',          category: 'text',  taskType: 'intent',       enabled: true, required: true,  allowModel: true,  timeout: 30_000 },
      { order: 2, key: 'compliance_check',    label: '合规校验',          category: 'text',  taskType: 'compliance',   enabled: true, required: true,  allowModel: false, timeout: 10_000 },
      { order: 3, key: 'viral_analyze',       label: '爆款逻辑拆解',      category: 'text',  taskType: 'viral_analyze',enabled: true, required: true,  allowModel: true,  timeout: 60_000 },
      { order: 4, key: 'prompt_wrap',         label: '提示词封装',        category: 'text',  taskType: 'prompt_wrap',  enabled: true, required: true,  allowModel: false, timeout: 10_000 },
      { order: 5, key: 'script_gen',          label: '专属脚本生成',      category: 'text',  taskType: 'script',       enabled: true, required: true,  allowModel: true,  timeout: 60_000 },
      { order: 6, key: 'storyboard_gen',      label: '分镜图生成',        category: 'image', taskType: 'storyboard',   enabled: true, required: true,  allowModel: true,  timeout: 300_000 },
      { order: 7, key: 'video_compose',       label: '投流视频合成',      category: 'video', taskType: 'video_compose',enabled: true, required: true,  allowModel: true,  timeout: 300_000 },
      { order: 8, key: 'voice_dub',           label: '配音字幕',          category: 'voice', taskType: 'tts',          enabled: true, required: false, allowModel: true,  timeout: 60_000 },
      { order: 9, key: 'pack_export',         label: '打包输出',          category: 'text',  taskType: 'export',       enabled: true, required: true,  allowModel: false, timeout: 30_000 },
    ],
  },

  // ==================== 工作流7: 语音配音&音频合成 ====================
  voice_audio: {
    id: 'voice_audio',
    name: '语音配音&音频合成',
    description: '文案/脚本→语音配音→音频合成→降噪规整→输出',
    category: 'voice',
    steps: [
      { order: 1, key: 'intent_classify',     label: '意图识别',          category: 'text',  taskType: 'intent',       enabled: true, required: true,  allowModel: true,  timeout: 30_000 },
      { order: 2, key: 'compliance_check',    label: '合规校验',          category: 'text',  taskType: 'compliance',   enabled: true, required: true,  allowModel: false, timeout: 10_000 },
      { order: 3, key: 'prompt_wrap',         label: '提示词封装',        category: 'text',  taskType: 'prompt_wrap',  enabled: true, required: true,  allowModel: false, timeout: 10_000 },
      { order: 4, key: 'text_prepare',        label: '文案预处理',        category: 'text',  taskType: 'text_prep',    enabled: true, required: true,  allowModel: false, timeout: 5_000 },
      { order: 5, key: 'voice_dub',            label: '语音模型配音',      category: 'voice', taskType: 'tts',          enabled: true, required: true,  allowModel: true,  timeout: 120_000 },
      { order: 6, key: 'audio_mix',           label: '音频合成',          category: 'audio', taskType: 'audio_mix',    enabled: false,required: false, allowModel: true,  timeout: 60_000 },
      { order: 7, key: 'noise_reduce',        label: '降噪规整',          category: 'audio', taskType: 'denoise',      enabled: true, required: false, allowModel: true,  timeout: 60_000 },
      { order: 8, key: 'pack_export',         label: '输出',              category: 'text',  taskType: 'export',       enabled: true, required: true,  allowModel: false, timeout: 10_000 },
    ],
  },
};

// ==================== 辅助函数 ====================

/** 获取所有工作流定义列表 */
export function listWorkflows() {
  return Object.values(WORKFLOW_DEFINITIONS).map(wf => ({
    id: wf.id,
    name: wf.name,
    description: wf.description,
    category: wf.category,
    stepsCount: wf.steps.length,
    requiredSteps: wf.steps.filter(s => s.required).length,
    optionalSteps: wf.steps.filter(s => !s.required).length,
  }));
}

/** 获取指定工作流定义 */
export function getWorkflow(id) {
  return WORKFLOW_DEFINITIONS[id] || null;
}

/** 获取工作流的所有步骤 (含自定义覆盖) */
export function getWorkflowSteps(workflowId, overrides = {}) {
  const wf = WORKFLOW_DEFINITIONS[workflowId];
  if (!wf) return [];

  let steps = [...wf.steps];

  // 应用步骤开关覆盖
  if (overrides.disabledSteps) {
    steps = steps.map(s => ({
      ...s,
      enabled: overrides.disabledSteps.includes(s.key) ? false : s.enabled,
    }));
  }

  // 应用模型绑定覆盖
  if (overrides.modelBindings) {
    steps = steps.map(s => ({
      ...s,
      modelKey: overrides.modelBindings[s.key] || s.modelKey || 'auto',
    }));
  }

  return steps;
}

/** 获取某工作流可用于模型绑定的步骤 */
export function getBindableSteps(workflowId) {
  const wf = WORKFLOW_DEFINITIONS[workflowId];
  if (!wf) return [];
  return wf.steps.filter(s => s.allowModel).map(s => ({
    key: s.key,
    label: s.label,
    category: s.category,
    taskType: s.taskType,
    currentModel: s.modelKey || 'auto',
  }));
}

export default { WORKFLOW_DEFINITIONS, listWorkflows, getWorkflow, getWorkflowSteps, getBindableSteps };
