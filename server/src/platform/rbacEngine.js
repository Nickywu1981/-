/**
 * Platform — 权限引擎
 *
 * 四层架构 - 中台层 - 权限引擎
 * 职责: 角色定义、权限点矩阵、中间件工厂
 *
 * 角色层级（数值越大权限越高）：
 *  user (1) → editor (2) → admin (3) → super_admin (4)
 *
 * B端角色（独立体系，不与C端等级交叉）：
 *  enterprise_admin / enterprise_operator / enterprise_viewer
 */
import { error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ========================= 角色定义 =========================

export const ROLES = {
  // C端角色（等级制）
  USER:         { level: 1, name: 'user' },
  EDITOR:       { level: 2, name: 'editor' },
  ADMIN:        { level: 3, name: 'admin' },
  SUPER_ADMIN:  { level: 4, name: 'super_admin' },

  // B端角色（独立体系）
  ENTERPRISE_ADMIN:    { level: 0, name: 'enterprise_admin',    category: 'enterprise', description: '企业管理员: 管理子账号/白标/套餐/API密钥' },
  ENTERPRISE_OPERATOR: { level: 0, name: 'enterprise_operator', category: 'enterprise', description: '企业操作员: 内容生成/查看数据' },
  ENTERPRISE_VIEWER:   { level: 0, name: 'enterprise_viewer',   category: 'enterprise', description: '企业观察者: 只读查看' },
};

// 角色名 → 等级
const ROLE_LEVEL = Object.fromEntries(
  Object.values(ROLES).map(r => [r.name, r.level]),
);

const ENTERPRISE_ROLES = new Set(['enterprise_admin', 'enterprise_operator', 'enterprise_viewer']);

// ========================= 权限定义 =========================

export const PERMISSIONS = {
  // 图片模块
  'image:read':    ROLES.USER,
  'image:write':   ROLES.USER,
  'image:batch':   ROLES.USER,

  // 视频模块
  'video:read':    ROLES.USER,
  'video:write':   ROLES.USER,
  'video:batch':   ROLES.EDITOR,

  // 批量处理
  'batch:submit':  ROLES.USER,
  'batch:manage':  ROLES.EDITOR,

  // 模板
  'template:read':  ROLES.USER,
  'template:write': ROLES.EDITOR,

  // 素材库
  'material:read':   ROLES.USER,
  'material:write':  ROLES.USER,
  'material:delete': ROLES.EDITOR,

  // 用户管理
  'user:read':   ROLES.ADMIN,
  'user:write':  ROLES.ADMIN,

  // 套餐/支付
  'plan:read':   ROLES.USER,
  'plan:manage': ROLES.ADMIN,

  // 订单
  'order:read':   ROLES.USER,
  'order:manage': ROLES.ADMIN,

  // 系统配置
  'config:read':  ROLES.ADMIN,
  'config:write': ROLES.SUPER_ADMIN,

  // 租户管理
  'tenant:read':  ROLES.ADMIN,
  'tenant:write': ROLES.SUPER_ADMIN,

  // 管理员看板
  'admin:dashboard': ROLES.ADMIN,

  // 开放 API
  'api:access': ROLES.USER,
  'api:manage': ROLES.ADMIN,

  // === B端权限点 ===
  'enterprise:manage':    ROLES.ENTERPRISE_ADMIN,   // 企业管理
  'enterprise:users':     ROLES.ENTERPRISE_ADMIN,   // 子账号管理
  'enterprise:billing':   ROLES.ENTERPRISE_ADMIN,   // 套餐/账单
  'enterprise:whitelabel': ROLES.ENTERPRISE_ADMIN,  // 白标配置
  'enterprise:apikey':    ROLES.ENTERPRISE_ADMIN,   // API Key管理

  // === 运营端权限点 ===
  'ops:moderation':   ROLES.EDITOR,   // 内容审核
  'ops:users':        ROLES.ADMIN,    // 用户运营
  'ops:campaigns':    ROLES.ADMIN,    // 活动管理
  'ops:analytics':    ROLES.ADMIN,    // 数据报表
  'ops:tickets':      ROLES.EDITOR,   // 工单处理
  'ops:distribution': ROLES.ADMIN,    // 分销管理
  'ops:notifications': ROLES.ADMIN,   // 通知推送
};

// ========================= 通用权限检查 =========================

export function hasPermission(user, permission) {
  if (!user || !PERMISSIONS[permission]) return false;
  const permDef = PERMISSIONS[permission];

  // B端权限点：直接匹配角色名
  if (ENTERPRISE_ROLES.has(permDef.name)) {
    return user.entRole === permDef.name || user.role === 'admin' || user.role === 'super_admin';
  }

  const requiredLevel = permDef.level;
  const userLevel = user.level || ROLE_LEVEL[user.role] || 1;
  return userLevel >= requiredLevel;
}

export function hasRole(user, roleName) {
  if (!user) return false;
  const normalized = roleName.toUpperCase();

  // B端角色：精确匹配
  if (ENTERPRISE_ROLES.has(roleName)) {
    return user.entRole === roleName || user.role === 'admin' || user.role === 'super_admin';
  }

  const requiredLevel = ROLES[normalized]?.level || 0;
  const userLevel = user.level || ROLE_LEVEL[user.role] || 1;
  return userLevel >= requiredLevel;
}

/**
 * 检查用户是否为企业端用户
 */
export function isEnterpriseUser(user) {
  return !!(user && (user.entId || ENTERPRISE_ROLES.has(user.entRole)));
}

// ========================= Express 中间件 =========================

export function requireRole(roleName) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, ERROR_CODE.UNAUTHORIZED, '请先登录');
    }
    if (!hasRole(req.user, roleName)) {
      return error(res, ERROR_CODE.FORBIDDEN, `需要 ${roleName} 权限`);
    }
    next();
  };
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, ERROR_CODE.UNAUTHORIZED, '请先登录');
    }
    if (!hasPermission(req.user, permission)) {
      return error(res, ERROR_CODE.FORBIDDEN, `需要 ${permission} 权限`);
    }
    next();
  };
}

export function requireAnyPermission(...permList) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, ERROR_CODE.UNAUTHORIZED, '请先登录');
    }
    const ok = permList.some(p => hasPermission(req.user, p));
    if (!ok) {
      return error(res, ERROR_CODE.FORBIDDEN, `需要 ${permList.join(' 或 ')} 权限`);
    }
    next();
  };
}

export function roleGuard(...roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    if (!req.user) {
      return error(res, ERROR_CODE.UNAUTHORIZED, '请先登录');
    }
    const userRole = req.user.role || 'user';
    if (allowed.has(userRole) || allowed.has(req.user.entRole)) {
      return next();
    }
    return error(res, ERROR_CODE.FORBIDDEN, `需要 ${roles.join('/')} 权限，当前角色 ${userRole} 无权访问`);
  };
}

export const adminOnly = requireRole('admin');
export const editorOrAbove = requireRole('editor');
export const userOrAbove = requireRole('user');

export default { ROLES, PERMISSIONS, hasPermission, hasRole, requireRole, requirePermission, requireAnyPermission, roleGuard, adminOnly, editorOrAbove, userOrAbove, isEnterpriseUser };
