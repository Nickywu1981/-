/**
 * 模型访问权限控制服务 — Model Access Control
 *
 * 权限模型：用户/角色/应用(appId) → 可调用模型白名单
 * 检查点：Gateway pre-invoke 阶段（GEO 检查之后）
 * 敏感能力管控：code_gen, image_gen, digital_human 可单独配置
 *
 * 配置来源：model_access_policies 表或 JSON 配置
 */
import logger from '../utils/logger.js';
import { securityConfig } from '../config/index.js';

// ==================== 配置 ====================

const config = {
  enabled: securityConfig.modelAclEnabled,
};

// 模型 → 能力分类映射
const MODEL_CAPABILITY_MAP = {
  'gpt-4o':               ['text_gen', 'code_gen', 'script_gen'],
  'gpt-4o-mini':          ['text_gen', 'translate'],
  'claude-sonnet-4-6':    ['text_gen', 'code_gen', 'compliance_check'],
  'claude-haiku-4-5':     ['text_gen', 'translate'],
  'claude-opus-4-7':      ['text_gen', 'code_gen', 'compliance_check'],
  'deepseek-v4-pro':      ['text_gen', 'code_gen'],
  'deepseek-v4-flash':    ['text_gen', 'translate'],
  'gpt-image-2':          ['image_gen', 'poster_gen', 'scene_gen'],
  'stable-diffusion-img2img': ['image_gen', 'bg_white', 'color_swap'],
  'seedance':             ['digital_human', 'img2video', 'video_edit'],
  'seedance-action-migrate': ['digital_human', 'action_migrate'],
};

// 默认角色权限策略
const DEFAULT_POLICIES = {
  admin: { models: '*', capabilities: '*' },
  editor: { models: '*', capabilities: ['text_gen', 'image_gen', 'translate'] },
  user: { models: '*', capabilities: ['text_gen', 'translate'] },
  guest: { models: ['gpt-4o-mini', 'claude-haiku-4-5'], capabilities: ['text_gen', 'translate'] },
  enterprise: { models: '*', capabilities: '*' },
};

// 从 JSON 环境变量加载自定义策略
function loadPolicies() {
  try {
    const custom = securityConfig.modelAclPolicies;
    if (custom) return { ...DEFAULT_POLICIES, ...JSON.parse(custom) };
  } catch (e) {
    logger.warn(`[ModelACL] 自定义策略解析失败: ${e.message}`);
  }
  return DEFAULT_POLICIES;
}

/**
 * 检查用户是否有权使用指定模型
 * @param {object} user - req.user { id, role, audience }
 * @param {string} modelId - 模型 ID
 * @param {string} taskType - 任务类型（用于敏感能力管控）
 * @returns {{ allowed: boolean, reason: string|null }}
 */
export function checkModelAccess(user, modelId, taskType = 'unknown') {
  if (!config.enabled) return { allowed: true, reason: null };

  const policies = loadPolicies();
  const role = user?.role || 'user';
  const policy = policies[role] || policies.user;

  // 模型白名单检查
  if (policy.models !== '*') {
    if (!policy.models.includes(modelId)) {
      return {
        allowed: false,
        reason: `模型 ${modelId} 不在您的使用范围内`,
      };
    }
  }

  // 敏感能力管控
  if (policy.capabilities !== '*') {
    const modelCapabilities = MODEL_CAPABILITY_MAP[modelId] || [];
    const sensitiveCaps = ['code_gen', 'image_gen', 'digital_human'];

    for (const cap of sensitiveCaps) {
      if (modelCapabilities.includes(cap) && !policy.capabilities.includes(cap)) {
        return {
          allowed: false,
          reason: `您没有权限使用 ${getCapabilityLabel(cap)} 功能`,
        };
      }
    }
  }

  return { allowed: true, reason: null };
}

function getCapabilityLabel(cap) {
  const labels = {
    code_gen: '代码生成',
    image_gen: '图片生成',
    digital_human: '数字人',
    text_gen: '文本生成',
    translate: '翻译',
    compliance_check: '合规审查',
  };
  return labels[cap] || cap;
}

/**
 * 批量检查：返回用户可用的模型列表
 */
export function getUserAllowedModels(user) {
  const policies = loadPolicies();
  const role = user?.role || 'user';
  const policy = policies[role] || policies.user;

  if (policy.models === '*') return '*';
  return policy.models;
}

export function getUserAllowedCapabilities(user) {
  const policies = loadPolicies();
  const role = user?.role || 'user';
  const policy = policies[role] || policies.user;
  return policy.capabilities;
}

export default { checkModelAccess, getUserAllowedModels, getUserAllowedCapabilities };
