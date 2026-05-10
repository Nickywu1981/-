import { describe, it, expect, vi } from 'vitest';
import {
  ROLES, PERMISSIONS, hasPermission, hasRole, roleGuard,
} from '../../middleware/rbac.js';

// ============================================================
// ROLES — 角色层级定义
// ============================================================
describe('ROLES', () => {
  it('定义 4 级角色', () => {
    expect(Object.keys(ROLES)).toHaveLength(4);
    expect(ROLES).toHaveProperty('USER');
    expect(ROLES).toHaveProperty('EDITOR');
    expect(ROLES).toHaveProperty('ADMIN');
    expect(ROLES).toHaveProperty('SUPER_ADMIN');
  });

  it('层级递增：user(1) < editor(2) < admin(3) < super_admin(4)', () => {
    expect(ROLES.USER.level).toBe(1);
    expect(ROLES.EDITOR.level).toBe(2);
    expect(ROLES.ADMIN.level).toBe(3);
    expect(ROLES.SUPER_ADMIN.level).toBe(4);
  });

  it('每种角色含 name 与 level', () => {
    for (const [, role] of Object.entries(ROLES)) {
      expect(role).toHaveProperty('name');
      expect(role).toHaveProperty('level');
      expect(typeof role.name).toBe('string');
      expect(typeof role.level).toBe('number');
    }
  });
});

// ============================================================
// PERMISSIONS — 权限矩阵
// ============================================================
describe('PERMISSIONS', () => {
  it('至少 22 个权限点', () => {
    expect(Object.keys(PERMISSIONS).length).toBeGreaterThanOrEqual(22);
  });

  it('图片/视频读取权限对 user 开放', () => {
    expect(PERMISSIONS['image:read'].level).toBe(1);
    expect(PERMISSIONS['video:read'].level).toBe(1);
  });

  it('视频批量操作需要 editor 以上', () => {
    expect(PERMISSIONS['video:batch'].level).toBe(2);
  });

  it('用户管理需要 admin 以上', () => {
    expect(PERMISSIONS['user:read'].level).toBe(3);
    expect(PERMISSIONS['user:write'].level).toBe(3);
  });

  it('系统配置写入需要 super_admin', () => {
    expect(PERMISSIONS['config:write'].level).toBe(4);
  });

  it('租户管理写入需要 super_admin', () => {
    expect(PERMISSIONS['tenant:write'].level).toBe(4);
  });

  it('模板管理：read 对 user、write 对 editor', () => {
    expect(PERMISSIONS['template:read'].level).toBe(1);
    expect(PERMISSIONS['template:write'].level).toBe(2);
  });

  it('所有权限引用 ROLES 对象', () => {
    for (const perm of Object.values(PERMISSIONS)) {
      expect(Object.values(ROLES)).toContain(perm);
    }
  });
});

// ============================================================
// hasPermission — 权限点检查（等级制）
// ============================================================
describe('hasPermission', () => {
  it('admin 拥有 image:read 权限', () => {
    expect(hasPermission({ role: 'admin' }, 'image:read')).toBe(true);
  });

  it('user 有 image:write 权限', () => {
    expect(hasPermission({ role: 'user' }, 'image:write')).toBe(true);
  });

  it('user 无 video:batch 权限（需 editor）', () => {
    expect(hasPermission({ role: 'user' }, 'video:batch')).toBe(false);
  });

  it('editor 有 video:batch 权限', () => {
    expect(hasPermission({ role: 'editor' }, 'video:batch')).toBe(true);
  });

  it('editor 无 user:write 权限（需 admin）', () => {
    expect(hasPermission({ role: 'editor' }, 'user:write')).toBe(false);
  });

  it('admin 有 user:write 权限', () => {
    expect(hasPermission({ role: 'admin' }, 'user:write')).toBe(true);
  });

  it('admin 无 config:write 权限（需 super_admin）', () => {
    expect(hasPermission({ role: 'admin' }, 'config:write')).toBe(false);
  });

  it('super_admin 有所有权限', () => {
    for (const perm of Object.keys(PERMISSIONS)) {
      expect(hasPermission({ role: 'super_admin' }, perm)).toBe(true);
    }
  });

  it('user 为 null 返回 false', () => {
    expect(hasPermission(null, 'image:read')).toBe(false);
  });

  it('user 为 undefined 返回 false', () => {
    expect(hasPermission(undefined, 'image:read')).toBe(false);
  });

  it('不存在的权限点返回 false', () => {
    expect(hasPermission({ role: 'admin' }, 'nonexistent:perm')).toBe(false);
  });

  it('未设置 role/level 默认 user(1)', () => {
    expect(hasPermission({}, 'image:read')).toBe(true);
  });

  it('优先使用 user.level 而非 user.role', () => {
    // role=admin 但 level=1 → 按 level 判定
    expect(hasPermission({ role: 'admin', level: 1 }, 'user:write')).toBe(false);
  });
});

// ============================================================
// hasRole — 角色等级检查
// ============================================================
describe('hasRole', () => {
  it('admin 满足 user 角色要求', () => {
    expect(hasRole({ role: 'admin' }, 'user')).toBe(true);
  });

  it('user 不满足 admin 角色要求', () => {
    expect(hasRole({ role: 'user' }, 'admin')).toBe(false);
  });

  it('editor 满足 editor 要求（等量）', () => {
    expect(hasRole({ role: 'editor' }, 'editor')).toBe(true);
  });

  it('editor 不满足 admin 要求', () => {
    expect(hasRole({ role: 'editor' }, 'admin')).toBe(false);
  });

  it('super_admin 满足所有角色', () => {
    expect(hasRole({ role: 'super_admin' }, 'user')).toBe(true);
    expect(hasRole({ role: 'super_admin' }, 'editor')).toBe(true);
    expect(hasRole({ role: 'super_admin' }, 'admin')).toBe(true);
    expect(hasRole({ role: 'super_admin' }, 'super_admin')).toBe(true);
  });

  it('user 为 null 返回 false', () => {
    expect(hasRole(null, 'admin')).toBe(false);
  });

  it('roleName 参数大小写不敏感，但 user.role 值必须全小写', () => {
    // roleName 通过 toUpperCase() 查找 ROLES，所以大小写不敏感
    expect(hasRole({ role: 'admin' }, 'ADMIN')).toBe(true);
    // 但 user.role 直接查 ROLE_LEVEL（仅含小写 key），大写会失败
    expect(hasRole({ role: 'ADMIN' }, 'admin')).toBe(false);
  });

  it('不存在的角色名 requiredLevel=0 无门槛 — 任何人通过', () => {
    // 未知 roleName → requiredLevel=0 → userLevel >= 0 总是 true
    expect(hasRole({ role: 'admin' }, 'unknown_role')).toBe(true);
    expect(hasRole({ role: 'user' }, 'unknown_role')).toBe(true);
  });

  it('优先使用 user.level', () => {
    expect(hasRole({ level: 3 }, 'admin')).toBe(true);
    expect(hasRole({ level: 1 }, 'admin')).toBe(false);
  });

  it('未设置 role/level 默认为 1', () => {
    expect(hasRole({}, 'user')).toBe(true);
    expect(hasRole({}, 'admin')).toBe(false);
  });
});

// ============================================================
// roleGuard — 白名单制角色守卫中间件工厂
// ============================================================
describe('roleGuard', () => {
  const mockRes = () => {
    const res = {};
    res.status = vi.fn(() => res);
    res.json = vi.fn(() => res);
    res.setHeader = vi.fn(() => res);
    return res;
  };

  it('用户角色在允许名单中调用 next', () => {
    const guard = roleGuard('admin', 'editor');
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    const next = vi.fn();

    guard(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('用户角色不在名单中返回 403', () => {
    const guard = roleGuard('admin');
    const req = { user: { role: 'user' } };
    const res = mockRes();
    const next = vi.fn();

    guard(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('未登录 req.user 为空返回 401', () => {
    const guard = roleGuard('admin');
    const req = { user: null };
    const res = mockRes();
    const next = vi.fn();

    guard(req, res, next);
    expect(res.json).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('单角色守卫 — admin 通过', () => {
    const guard = roleGuard('admin');
    const req = { user: { role: 'admin' } };
    const next = vi.fn();
    guard(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('3 个角色任一匹配即通过', () => {
    const guard = roleGuard('admin', 'editor', 'super_admin');
    const req = { user: { role: 'editor' } };
    const next = vi.fn();
    guard(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('默认 role 为 user', () => {
    const guard = roleGuard('user');
    const req = { user: {} };
    const next = vi.fn();
    guard(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('错误消息包含所需角色列表', () => {
    const guard = roleGuard('admin', 'super_admin');
    const req = { user: { role: 'user' } };
    const res = mockRes();

    guard(req, res, vi.fn());
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.msg).toContain('admin');
    expect(callArg.msg).toContain('super_admin');
  });
});

