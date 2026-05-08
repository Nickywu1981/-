/**
 * 动态权限路由 — 根据用户角色动态生成菜单
 */

interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  route?: string;
  children?: MenuItem[];
  roles?: string[]; // 允许访问的角色
}

interface UserInfo {
  id: number;
  username: string;
  role: string; // 'admin' | 'user' | 'vip' | 'free'
}

/** 完整菜单配置 */
const fullMenu: MenuItem[] = [
  {
    key: 'work', label: '工作台', icon: 'desktop', route: '/workspace', roles: ['admin', 'user', 'vip', 'free'],
  },
  { key: 'divider1', label: '', roles: ['admin', 'user', 'vip', 'free'] },
  {
    key: 'image', label: '图片工具', icon: 'image', roles: ['admin', 'user', 'vip', 'free'],
    children: [
      { key: 'main-image', label: '智能做主图', route: '/work/main-image', roles: ['admin', 'user', 'vip', 'free'] },
      { key: 'scene', label: '智能做场景', route: '/work/scene', roles: ['admin', 'user', 'vip', 'free'] },
      { key: 'detail-h5', label: '智能做详情', route: '/work/detail-h5', roles: ['admin', 'user', 'vip', 'free'] },
      { key: 'remove-bg', label: 'AI 抠图', route: '/work/remove-bg', roles: ['admin', 'user', 'vip', 'free'] },
      { key: 'white-bg', label: '白底图', route: '/work/white-bg', roles: ['admin', 'user', 'vip', 'free'] },
      { key: 'retouch', label: 'AI 精修', route: '/work/retouch', roles: ['admin', 'user', 'vip', 'free'] },
      { key: 'outpaint', label: '画面扩展', route: '/work/outpaint', roles: ['admin', 'user', 'vip'] },
      { key: 'virtual-tryon', label: '虚拟模特', route: '/work/virtual-tryon', roles: ['admin', 'user', 'vip'] },
      { key: 'color-change', label: '商品换色', route: '/work/color-change', roles: ['admin', 'user', 'vip'] },
      { key: 'style-transfer', label: '风格转化', route: '/work/style-transfer', roles: ['admin', 'user', 'vip'] },
    ],
  },
  {
    key: 'video', label: '视频工具', icon: 'video', roles: ['admin', 'user', 'vip'],
    children: [
      { key: 'video', label: '智能做视频', route: '/work/video', roles: ['admin', 'user', 'vip'] },
      { key: 'script-gen', label: '带货脚本', route: '/work/script-gen', roles: ['admin', 'user', 'vip'] },
      { key: 'storyboard', label: '视频分镜', route: '/work/storyboard', roles: ['admin', 'user', 'vip'] },
      { key: 'viral-clone', label: '爆款复刻', route: '/work/viral-clone', roles: ['admin', 'user', 'vip'] },
      { key: 'viral-replicate', label: '风格复刻', route: '/work/viral-replicate', roles: ['admin', 'user', 'vip'] },
      { key: 'video-edit', label: '视频编辑', route: '/work/video-edit', roles: ['admin', 'user', 'vip'] },
      { key: 'voice-gen', label: '声音生成', route: '/work/voice-gen', roles: ['admin', 'user', 'vip'] },
      { key: 'digital-human', label: '数字人', route: '/work/digital-human', roles: ['admin', 'user', 'vip'] },
    ],
  },
  {
    key: 'batch', label: '批量处理', icon: 'batch', route: '/work/batch', roles: ['admin', 'user', 'vip'],
  },
  { key: 'divider2', label: '', roles: ['admin', 'user', 'vip', 'free'] },
  {
    key: 'admin', label: '管理后台', icon: 'admin', route: '/admin/dashboard', roles: ['admin'],
  },
];

/** 根据角色过滤菜单 */
export function getMenuByRole(role: string): MenuItem[] {
  return fullMenu
    .filter((item) => !item.roles || item.roles.includes(role))
    .map((item) => ({
      ...item,
      children: item.children
        ? item.children.filter((child) => !child.roles || child.roles.includes(role))
        : undefined,
    }));
}

/** 检查路由是否有权限访问 */
export function hasRouteAccess(role: string, route: string): boolean {
  const menu = getMenuByRole(role);
  function find(items: MenuItem[]): boolean {
    for (const item of items) {
      if (item.route === route) return true;
      if (item.children && find(item.children)) return true;
    }
    return false;
  }
  return find(menu);
}

export type { MenuItem, UserInfo };
export default getMenuByRole;
