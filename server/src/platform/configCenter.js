/**
 * Platform — 配置中心
 *
 * 四层架构 - 中台层 - 配置中心
 * 职责: 合并 v4_config + siteConfig 双系统，提供统一配置入口
 *
 * 配置分层:
 *  - 系统级 (sys.*):      仅 super_admin 可写
 *  - 业务级 (biz.*):      admin 可写
 *  - 页面级 (page.*):     公开可读, admin 可写
 *  - 特性开关 (feature.*): admin 可写, 支持灰度
 *  - 字典 (dict.*):       admin 可写
 */

/**
 * 配置项权限级别定义
 */
export const CONFIG_PERMISSION_LEVELS = {
  'sys.':    { read: 'admin', write: 'super_admin', description: '系统级配置' },
  'biz.':    { read: 'user',  write: 'admin',       description: '业务级配置' },
  'page.':   { read: 'public', write: 'admin',      description: '页面展示配置' },
  'feature.':{ read: 'user',  write: 'admin',       description: '特性开关(支持灰度)' },
  'dict.':   { read: 'public', write: 'admin',      description: '数据字典' },
};

/**
 * 根据 key prefix 推断权限级别
 * @param {string} key
 * @returns {{ read: string, write: string }}
 */
export function getConfigPermission(key) {
  for (const [prefix, perm] of Object.entries(CONFIG_PERMISSION_LEVELS)) {
    if (key.startsWith(prefix)) return perm;
  }
  return { read: 'user', write: 'admin' };
}

/**
 * 获取当前用户可写入的配置前缀白名单
 * @param {Object} user
 * @returns {string[]}
 */
export function getWritablePrefixes(user) {
  const role = user?.role || 'user';
  const prefixes = [];
  for (const [prefix, perm] of Object.entries(CONFIG_PERMISSION_LEVELS)) {
    if (role === 'super_admin') { prefixes.push(prefix); continue; }
    if (role === 'admin' && perm.write === 'admin') { prefixes.push(prefix); }
  }
  return prefixes;
}

/**
 * 验证用户是否有写入指定配置项的权限
 * @param {Object} user
 * @param {string} key
 * @returns {boolean}
 */
export function canWriteConfig(user, key) {
  const perm = getConfigPermission(key);
  if (perm.write === 'super_admin') return user?.role === 'super_admin';
  if (perm.write === 'admin') {
    return user?.role === 'admin' || user?.role === 'super_admin';
  }
  return false;
}
