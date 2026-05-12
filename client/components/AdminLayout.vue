<!--
  AdminLayout — 管理后台骨架：分组侧边栏 + 顶栏 + 内容区
  与工作台共享同一套「温润精工」设计语言
-->
<template>
  <div class="al">
    <!-- 移动端汉堡 -->
    <button class="al-ham" @click="open = !open" :aria-label="open ? '关闭菜单' : '打开菜单'">{{ open ? '✕' : '☰' }}</button>

    <!-- 左侧分组导航 -->
    <aside class="al-side" :class="{ on: open }">
      <div class="al-logo" @click="$router.push('/admin/dashboard')">
        <span class="al-logo-dot"></span>
        Movio 管理
      </div>

      <nav class="al-nav">
        <template v-for="g in groups" :key="g.key">
          <div
            class="al-grp-hd"
            @click="g.open = !g.open"
          >
            <span class="al-grp-ic">{{ g.icon }}</span>
            <span class="al-grp-lbl">{{ g.label }}</span>
            <span class="al-grp-arr" :class="{ down: g.open }">▸</span>
          </div>
          <div v-show="g.open" class="al-grp-body">
            <NuxtLink
              v-for="item in g.items"
              :key="item.key"
              :to="item.route"
              class="al-item"
            >{{ item.label }}</NuxtLink>
          </div>
        </template>
      </nav>

      <div class="al-side-ft">
        <button class="al-theme-btn" @click="toggleTheme" :title="theme === 'dark' ? '切换亮色' : '切换暗色'" :aria-label="theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'">
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>
        <NuxtLink to="/workspace" class="al-back">← 返回工作台</NuxtLink>
      </div>
    </aside>

    <!-- 遮罩 -->
    <div v-if="open" class="al-mask" @click="open = false" />

    <!-- 右侧主区域 -->
    <main class="al-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const open = ref(false)
const route = useRoute()
const { theme, toggle: toggleTheme } = useTheme()
watch(() => route.path, () => { open.value = false })

interface NavItem { key: string; label: string; route: string }
interface NavGroup { key: string; icon: string; label: string; open: boolean; items: NavItem[] }

const groups = reactive<NavGroup[]>([
  {
    key: 'overview', icon: '📊', label: '数据总览', open: true,
    items: [
      { key: 'dashboard', label: '数据看板', route: '/admin/dashboard' },
      { key: 'analytics', label: '数据统计', route: '/admin/analytics' },
    ],
  },
  {
    key: 'users', icon: '👥', label: '用户体系', open: false,
    items: [
      { key: 'users', label: '用户管理', route: '/admin/users' },
      { key: 'tenants', label: '租户管理', route: '/admin/tenants' },
      { key: 'tier', label: '会员等级', route: '/admin/tier' },
    ],
  },
  {
    key: 'finance', icon: '💳', label: '交易财务', open: false,
    items: [
      { key: 'plans', label: '套餐配置', route: '/admin/plans' },
      { key: 'orders', label: '套餐订单', route: '/admin/orders' },
      { key: 'recharge', label: '充值订单', route: '/admin/recharge' },
      { key: 'credits', label: '积分消费', route: '/admin/credits' },
    ],
  },
  {
    key: 'ops', icon: '📋', label: '任务运营', open: false,
    items: [
      { key: 'tasks', label: '任务管理', route: '/admin/tasks' },
      { key: 'automation', label: '自动化任务', route: '/admin/automation' },
      { key: 'notifications', label: '通知管理', route: '/admin/notifications' },
      { key: 'badges', label: '营销标签', route: '/admin/badges' },
      { key: 'campaigns', label: '运营活动', route: '/admin/campaigns' },
      { key: 'enterprises', label: '企业审批', route: '/admin/enterprises' },
      { key: 'coupons', label: '优惠券管理', route: '/admin/coupons' },
      { key: 'announcements', label: '公告管理', route: '/admin/announcements' },
    ],
  },
  {
    key: 'content', icon: '🎨', label: '内容与模板', open: false,
    items: [
      { key: 'collection', label: '作品集管理', route: '/admin/collection' },
      { key: 'prompts', label: '提示词模板', route: '/admin/prompts' },
      { key: 'templates', label: '模板管理', route: '/admin/templates' },
      { key: 'diy-pages', label: 'DIY 页面管理', route: '/admin/diy-pages' },
      { key: 'workspace-diy', label: '工作台 DIY', route: '/admin/workspace-diy' },
    ],
  },
  {
    key: 'msg', icon: '📢', label: '消息通信', open: false,
    items: [
      { key: 'sms-templates', label: '短信模板', route: '/admin/sms-templates' },
      { key: 'sms-logs', label: '短信日志', route: '/admin/sms-logs' },
      { key: 'email-templates', label: '邮件模板', route: '/admin/email-templates' },
    ],
  },
  {
    key: 'security', icon: '🛡️', label: '风控合规', open: false,
    items: [
      { key: 'moderation', label: '内容审核', route: '/admin/moderation' },
      { key: 'abuse', label: '滥用监控', route: '/admin/abuse' },
      { key: 'compliance', label: '合规检查', route: '/admin/compliance' },
      { key: 'geo-rules', label: 'GEO 规则', route: '/admin/geo-rules' },
    ],
  },
  {
    key: 'system', icon: '⚙️', label: '系统配置', open: false,
    items: [
      { key: 'site-config', label: '站点配置', route: '/admin/site-config' },
      { key: 'brand-settings', label: '品牌配置', route: '/admin/brand-settings' },
      { key: 'ai-models', label: 'AI 模型', route: '/admin/ai-models' },
      { key: 'multilingual', label: '多语言', route: '/admin/multilingual' },
      { key: 'proxy', label: 'API 代理', route: '/admin/proxy' },
      { key: 'config', label: '配置中心', route: '/admin/config' },
      { key: 'settings', label: '系统设置', route: '/admin/settings' },
      { key: 'kb-management', label: '知识库管理', route: '/admin/kb-management' },
    ],
  },
  {
    key: 'tools', icon: '🔧', label: '工具集', open: false,
    items: [
      { key: 'forms', label: '表单管理', route: '/admin/forms' },
      { key: 'form-templates', label: '表单模板', route: '/admin/form-templates' },
      { key: 'size-templates', label: '尺寸模板', route: '/admin/size-templates' },
      { key: 'test-workbench', label: '测试工作台', route: '/admin/test-workbench' },
    ],
  },
  {
    key: 'audit', icon: '📝', label: '审计日志', open: false,
    items: [
      { key: 'logs', label: '操作日志', route: '/admin/logs' },
      { key: 'ai-logs', label: 'AI 调用日志', route: '/admin/ai-logs' },
    ],
  },
])

// Auto-expand the group containing current route
watch(() => route.path, (p) => {
  for (const g of groups) {
    if (g.items.some(it => p.startsWith(it.route))) {
      g.open = true
    }
  }
}, { immediate: true })
</script>

<style scoped>
/* ================================================
   ADMIN LAYOUT — 与 workspace 一脉相承
   ================================================ */
.al {
  display: flex;
  min-height: calc(100vh - 56px);
  position: relative;
}

/* ---- 移动端汉堡 ---- */
.al-ham {
  display: none;
  position: fixed; top: 64px; left: 12px; z-index: 200;
  background: var(--bg-card); color: var(--text-primary);
  border: 1px solid var(--border-light); width: 38px; height: 38px;
  border-radius: 8px; font-size: 17px; cursor: pointer;
}
.al-ham:hover { background: var(--border-light); }

/* ---- 侧边栏 ---- */
.al-side {
  width: 200px; min-width: 200px;
  background: var(--bg-card); border-right: 1px solid var(--border-light);
  display: flex; flex-direction: column;
  padding: 12px 8px; gap: 2px;
  overflow-y: auto; z-index: 150;
  transition: transform 0.25s;
  flex-shrink: 0;
}

.al-logo {
  font-size: 15px; font-weight: 600; color: var(--text-primary);
  padding: 4px 10px 12px; letter-spacing: -0.03em;
  display: flex; align-items: center; gap: 7px;
  cursor: pointer;
}
.al-logo-dot { width: 7px; height: 7px; border-radius: 2px; background: var(--text-primary); }

.al-nav { display: flex; flex-direction: column; gap: 0; flex: 1; }

/* ---- 分组标题 ---- */
.al-grp-hd {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 10px; border-radius: 8px;
  font-size: 12.5px; color: var(--text-muted); font-weight: 500;
  cursor: pointer; user-select: none;
  transition: background 0.15s, color 0.15s;
}
.al-grp-hd:hover { background: var(--border-light); color: var(--text-secondary); }
.al-grp-ic { font-size: 13px; width: 18px; text-align: center; flex-shrink: 0; }
.al-grp-lbl { flex: 1; }
.al-grp-arr {
  font-size: 10px; transition: transform 0.15s;
  color: var(--text-muted); flex-shrink: 0;
}
.al-grp-arr.down { transform: rotate(90deg); }

/* ---- 分组子项 ---- */
.al-grp-body {
  display: flex; flex-direction: column;
  padding-left: 24px; margin-bottom: 4px;
}
.al-item {
  display: block; padding: 7px 10px; border-radius: 6px;
  font-size: 13px; color: var(--text-secondary); text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.al-item:hover { background: var(--border-light); color: var(--text-primary); }
.al-item.router-link-active {
  background: var(--brand); color: var(--white); font-weight: 500;
}

/* ---- 侧边栏底部 ---- */
.al-side-ft {
  padding: 8px 10px; border-top: 1px solid var(--border-light);
}
.al-back {
  font-size: 12px; color: var(--text-muted); text-decoration: none;
  transition: color 0.15s;
}
.al-back:hover { color: var(--text-primary); }
.al-theme-btn {
  background: none; border: 1px solid var(--border-light);
  border-radius: 8px; font-size: 16px; cursor: pointer;
  padding: 4px 6px; margin-right: 8px;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}
.al-theme-btn:hover { background: var(--bg-hover); border-color: var(--brand); }

/* ---- 主内容 ---- */
.al-main {
  flex: 1; padding: 28px 32px;
  background: var(--bg-page); overflow-y: auto;
  min-width: 0;
}

/* ---- 遮罩 ---- */
.al-mask { display: none; }

/* ---- 响应式 ---- */
@media (max-width: 768px) {
  .al-ham { display: flex; align-items: center; justify-content: center; }

  .al-side {
    position: fixed; top: 56px; left: 0; bottom: 0;
    transform: translateX(-100%); z-index: 160;
    box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  }
  .al-side.on { transform: translateX(0); }

  .al-mask {
    display: block; position: fixed; inset: 0; top: 56px;
    background: rgba(0,0,0,0.25); z-index: 155;
  }

  .al-main { padding: 16px; }
}

@media (min-width: 769px) and (max-width: 1100px) {
  .al-side { width: 180px; min-width: 180px; }
  .al-item { font-size: 12px; padding: 6px 9px; }
}

.al-side::-webkit-scrollbar { width: 4px; }
.al-side::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 4px; }
.al-side::-webkit-scrollbar-track { background: transparent; }
</style>
