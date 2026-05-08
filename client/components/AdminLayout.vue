<template>
  <div class="admin-layout">
    <button class="menu-toggle" @click="sidebarOpen = !sidebarOpen">{{ sidebarOpen ? '✕' : '☰' }}</button>
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <h2 class="s-logo">管理后台</h2>
      <nav class="s-nav">
        <NuxtLink to="/admin/dashboard" class="nav-item">📊 数据看板</NuxtLink>
        <NuxtLink to="/admin/site-config" class="nav-item">⚙️ 站点配置</NuxtLink>
        <NuxtLink to="/admin/config" class="nav-item">🔧 配置中心</NuxtLink>
        <NuxtLink to="/admin/users" class="nav-item">👥 用户管理</NuxtLink>
        <NuxtLink to="/admin/tasks" class="nav-item">📋 任务管理</NuxtLink>
        <NuxtLink to="/admin/plans" class="nav-item">💳 套餐配置</NuxtLink>
        <NuxtLink to="/admin/orders" class="nav-item">📋 套餐订单</NuxtLink>
        <NuxtLink to="/admin/prompts" class="nav-item">💬 提示词模板</NuxtLink>
        <NuxtLink to="/admin/templates" class="nav-item">📄 模板管理</NuxtLink>
        <NuxtLink to="/admin/ai-models" class="nav-item">🧠 AI 模型</NuxtLink>
        <NuxtLink to="/admin/test-workbench" class="nav-item">🧪 测试工作台</NuxtLink>
        <NuxtLink to="/admin/tenants" class="nav-item">🏢 租户管理</NuxtLink>
        <NuxtLink to="/admin/diy" class="nav-item">🎨 DIY页面</NuxtLink>
        <NuxtLink to="/admin/diy-pages" class="nav-item">📄 DIY页面管理</NuxtLink>
        <NuxtLink to="/admin/forms" class="nav-item">📝 表单管理</NuxtLink>
        <NuxtLink to="/admin/form-templates" class="nav-item">📋 表单模板</NuxtLink>
        <NuxtLink to="/admin/proxy" class="nav-item">🔗 API代理</NuxtLink>
        <NuxtLink to="/admin/recharge" class="nav-item">💰 充值订单</NuxtLink>
        <NuxtLink to="/admin/credits" class="nav-item">💎 积分消费</NuxtLink>
        <NuxtLink to="/admin/notifications" class="nav-item">🔔 通知管理</NuxtLink>
        <NuxtLink to="/admin/automation" class="nav-item">🤖 自动化任务</NuxtLink>
        <NuxtLink to="/admin/sms-templates" class="nav-item">📱 短信模板</NuxtLink>
        <NuxtLink to="/admin/sms-logs" class="nav-item">📤 短信日志</NuxtLink>
        <NuxtLink to="/admin/email-templates" class="nav-item">📧 邮件模板</NuxtLink>
        <NuxtLink to="/admin/collection" class="nav-item">🖼️ 作品集管理</NuxtLink>
        <NuxtLink to="/admin/tier" class="nav-item">⭐ 会员等级</NuxtLink>
        <NuxtLink to="/admin/brand-settings" class="nav-item">🎨 品牌配置</NuxtLink>
        <NuxtLink to="/admin/size-templates" class="nav-item">📐 尺寸模板</NuxtLink>
        <NuxtLink to="/admin/multilingual" class="nav-item">🌐 多语言</NuxtLink>
        <NuxtLink to="/admin/compliance" class="nav-item">🛡️ 合规检查</NuxtLink>
        <NuxtLink to="/admin/analytics" class="nav-item">📊 数据统计</NuxtLink>
        <NuxtLink to="/admin/settings" class="nav-item">🔧 系统设置</NuxtLink>
        <NuxtLink to="/admin/moderation" class="nav-item">🛡️ 内容审核</NuxtLink>
        <NuxtLink to="/admin/badges" class="nav-item">🏷️ 营销标签</NuxtLink>
        <NuxtLink to="/admin/abuse" class="nav-item">🚨 滥用监控</NuxtLink>
        <NuxtLink to="/admin/logs" class="nav-item">📝 操作日志</NuxtLink>
        <NuxtLink to="/admin/ai-logs" class="nav-item">🤖 AI调用日志</NuxtLink>
        <NuxtLink to="/" class="nav-item nav-back">← 返回前台</NuxtLink>
      </nav>
    </aside>
    <div v-if="sidebarOpen" class="overlay" @click="sidebarOpen = false" />
    <main class="content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const sidebarOpen = ref(false)
const route = useRoute()
watch(() => route.path, () => { sidebarOpen.value = false })
</script>

<style scoped>
/* ================================================
   ADMIN LAYOUT — responsive sidebar + content
   ================================================ */
.admin-layout { display: flex; min-height: calc(100vh - 56px); position: relative; }

/* Hamburger toggle — only visible on mobile */
.menu-toggle {
  display: none; position: fixed; top: 64px; left: 12px; z-index: 200;
  background: var(--sidebar-bg); color: var(--sidebar-text-active);
  border: 1px solid var(--border-light); width: 38px; height: 38px;
  border-radius: var(--radius-md); font-size: 18px; cursor: pointer;
  transition: all var(--transition-fast); box-shadow: var(--shadow-sm);
}
.menu-toggle:hover { background: var(--sidebar-hover-bg); border-color: var(--brand); }

/* ================================================
   SIDEBAR
   ================================================ */
.sidebar {
  width: var(--sidebar-width); min-width: var(--sidebar-width);
  background: var(--sidebar-bg); color: var(--sidebar-text-active);
  padding: 20px 0; flex-shrink: 0; transition: transform 0.3s ease;
  z-index: 150; overflow-y: auto; border-right: 1px solid var(--border-light);
}

.s-logo {
  font-size: 16px; font-weight: 700; padding: 0 20px 16px;
  border-bottom: 1px solid var(--border-light); margin-bottom: 12px;
  color: var(--sidebar-text-active); white-space: nowrap;
}

.s-nav { display: flex; flex-direction: column; gap: 2px; padding: 0 8px; }

.nav-item {
  padding: 9px 14px; color: var(--sidebar-text); text-decoration: none;
  font-size: 13px; border-radius: var(--radius-md); border-left: 3px solid transparent;
  transition: all var(--transition-fast); position: relative; white-space: nowrap;
}
.nav-item:hover { background: var(--sidebar-hover-bg); color: var(--sidebar-text-active); }

.nav-item.router-link-active {
  background: var(--sidebar-active-bg); color: var(--sidebar-text-active);
  border-left-color: var(--brand);
  box-shadow: inset 0 0 0 1px rgba(124,58,237,0.12);
}
.nav-item.router-link-active::before {
  content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 3px; height: 20px; border-radius: 0 3px 3px 0;
  background: var(--brand-gradient);
}

.nav-back {
  margin-top: 12px; border-top: 1px solid var(--border-light);
  padding-top: 12px; border-radius: 0; font-size: 12px; color: var(--text-muted);
}
.nav-back:hover { color: var(--brand) !important; }

/* ================================================
   CONTENT AREA
   ================================================ */
.content {
  flex: 1; padding: clamp(16px, 3vw, 32px); background: var(--bg-page);
  overflow-y: auto; min-width: 0; width: 100%;
}

/* Overlay — mobile backdrop */
.overlay { display: none; }

/* ================================================
   RESPONSIVE — Mobile: slide-in sidebar
   ================================================ */
@media (max-width: 768px) {
  .menu-toggle { display: flex; align-items: center; justify-content: center; }

  .sidebar {
    position: fixed; top: 56px; left: 0; bottom: 0;
    transform: translateX(-100%); z-index: 160;
    box-shadow: var(--shadow-dropdown);
  }
  .sidebar.open { transform: translateX(0); }

  .overlay {
    display: block; position: fixed; inset: 0; top: 56px;
    background: var(--modal-overlay); z-index: 155;
    animation: overlay-fade-in var(--transition-base);
  }

  .content { padding: clamp(12px, 3vw, 20px); }
}

/* ================================================
   RESPONSIVE — Wide sidebar on larger screens
   ================================================ */
@media (min-width: 769px) and (max-width: 1100px) {
  .sidebar { width: 200px; min-width: 200px; }
  .s-logo { font-size: 14px; padding: 0 14px 14px; }
  .nav-item { font-size: 12px; padding: 7px 12px; }
}

/* ================================================
   Scrollbar for sidebar
   ================================================ */
.sidebar::-webkit-scrollbar { width: 4px; }
.sidebar::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 4px; }
.sidebar::-webkit-scrollbar-track { background: transparent; }
</style>
