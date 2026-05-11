/**
 * RBAC 角色权限中间件
 *
 * 角色层级（数值越大权限越高）：
 *  user (1) → editor (2) → admin (3) → super_admin (4)
 *
 * Phase 0-A (2026-05-11): 新版权限引擎含B端角色已迁移至 server/src/platform/rbacEngine.js
 * 本文件保留向后兼容，所有原有导出不变 (不含 B端角色)。
 *
 * 使用方式：router.get('/sensitive', requireRole('admin'), handler)
 */
import { error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ========================= 角色定义 =========================

export const ROLES = {
  USER:              { level: 1, name: 'user' },
  EDITOR:            { level: 2, name: 'editor' },
  ENTERPRISE_VIEWER: { level: 2, name: 'enterprise_viewer' },
  AGENT_VIEWER:      { level: 2, name: 'agent_viewer' },
  ADMIN:             { level: 3, name: 'admin' },
  ENTERPRISE_OPERATOR: { level: 3, name: 'enterprise_operator' },
  AGENT_OPERATOR:    { level: 3, name: 'agent_operator' },
  ENTERPRISE_ADMIN:  { level: 4, name: 'enterprise_admin' },
  AGENT_ADMIN:       { level: 4, name: 'agent_admin' },
  SUPER_ADMIN:       { level: 4, name: 'super_admin' },
};

// 角色名 → 等级
const ROLE_LEVEL = Object.fromEntries(
  Object.values(ROLES).map(r => [r.name, r.level]),
);

// ========================= 权限定义 =========================

// 每个粗粒度权限点对应的最低角色要求
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
  'template:read': ROLES.USER,
  'template:write': ROLES.EDITOR,

  // 素材库
  'material:read': ROLES.USER,
  'material:write': ROLES.USER,
  'material:delete': ROLES.EDITOR,

  // 用户管理
  'user:read':     ROLES.ADMIN,
  'user:write':    ROLES.ADMIN,

  // 套餐/支付
  'plan:read':     ROLES.USER,
  'plan:manage':   ROLES.ADMIN,

  // 订单
  'order:read':    ROLES.USER,
  'order:manage':  ROLES.ADMIN,

  // 系统配置
  'config:read':   ROLES.ADMIN,
  'config:write':  ROLES.SUPER_ADMIN,

  // 租户管理
  'tenant:read':   ROLES.ADMIN,
  'tenant:write':  ROLES.SUPER_ADMIN,

  // 管理员看板
  'admin:dashboard': ROLES.ADMIN,

  // 开放 API
  'api:access':    ROLES.USER,
  'api:manage':    ROLES.ADMIN,

  // ==================== Phase 2: B端权限点 ====================

  // 企业信息
  'enterprise:profile:write':   ROLES.ENTERPRISE_ADMIN,

  // 子账号管理
  'enterprise:users:manage':    ROLES.ENTERPRISE_ADMIN,

  // 渠道管理（仅代理）
  'enterprise:channel:manage':  ROLES.AGENT_ADMIN,

  // 客户管理
  'enterprise:customer:read':   ROLES.ENTERPRISE_VIEWER,
  'enterprise:customer:manage': ROLES.ENTERPRISE_ADMIN,

  // 财务管理
  'enterprise:finance:read':    ROLES.ENTERPRISE_VIEWER,
  'enterprise:finance:withdraw': ROLES.AGENT_ADMIN,
  'enterprise:settlement:manage': ROLES.AGENT_ADMIN,

  // 推广分销
  'enterprise:promotion:manage': ROLES.ENTERPRISE_OPERATOR,

  // 订单管理
  'enterprise:order:read':      ROLES.ENTERPRISE_VIEWER,
  'enterprise:order:manage':    ROLES.ENTERPRISE_OPERATOR,

  // 报表导出
  'enterprise:report:export':   ROLES.ENTERPRISE_ADMIN,
};

// ========================= 通用权限检查 =========================

/**
 * 检查是否有指定权限
 */
export function hasPermission(user, permission) {
  if (!user || !PERMISSIONS[permission]) return false;
  const requiredLevel = PERMISSIONS[permission].level;
  const userLevel = user.level || ROLE_LEVEL[user.role] || 1;
  return userLevel >= requiredLevel;
}

/**
 * 检查是否满足最低角色要求
 */
export function hasRole(user, roleName) {
  if (!user) return false;
  const requiredLevel = ROLES[roleName.toUpperCase()]?.level || 0;
  // C端角色检查
  const cLevel = user.level || ROLE_LEVEL[user.role] || 1;
  if (cLevel >= requiredLevel) return true;
  // B端角色检查（企业/代理用户的 entRole）
  if (user.entRole) {
    const bLevel = ROLE_LEVEL[user.entRole] || 0;
    if (bLevel >= requiredLevel) return true;
  }
  return false;
}

// ========================= Express 中间件 =========================

/**
 * 要求最低角色级别
 * @param {string} roleName - 'admin' | 'editor' | 'super_admin' 等
 */
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

/**
 * 要求指定权限点
 * @param {string} permission - 'image:write' 等
 */
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

/**
 * 要求多个权限中的任意一个（OR 逻辑）
 */
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

/** 快捷别名 — 使用等级制 requireRole，确保 super_admin 不被误拦截 */
export const adminOnly = requireRole('admin');
export const editorOrAbove = requireRole('editor');
export const userOrAbove = requireRole('user');

export default { ROLES, PERMISSIONS, hasPermission, hasRole, requireRole, requirePermission, requireAnyPermission, roleGuard, adminOnly, editorOrAbove, userOrAbove };

/**
 * 角色守卫中间件工厂 — 允许传入的任一角色匹配即通过（OR 逻辑，非等级制）
 * @param  {...string} roles 允许的角色列表，如 'admin', 'editor', 'user'
 * @returns {Function} Express 中间件
 *
 * 与 requireRole 的区别：requireRole 是等级制（admin 及以上），
 * roleGuard 是白名单制（只有列出的角色可以通过）
 *
 * 使用示例：
 *   router.delete('/xxx', authMiddleware, roleGuard('admin'), handler);
 *   router.put('/xxx',  authMiddleware, roleGuard('admin', 'editor'), handler);
 */
export function roleGuard(...roles) {
  const allowed = new Set(roles);

  return (req, res, next) => {
    if (!req.user) {
      return error(res, ERROR_CODE.UNAUTHORIZED, '请先登录');
    }

    const userRole = req.user.role || 'user';

    if (allowed.has(userRole)) {
      return next();
    }

    return error(
      res,
      ERROR_CODE.FORBIDDEN,
      `需要 ${roles.join('/')} 权限，当前角色 ${userRole} 无权访问`,
    );
  };
}
