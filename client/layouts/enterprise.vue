<template>
  <div class="enterprise-layout">
    <!-- 侧边栏 -->
    <aside class="ent-sidebar">
      <div class="ent-brand">
        <h2 @click="navigateTo('/enterprise/dashboard')">{{ entName || '企业中心' }}</h2>
      </div>
      <nav class="ent-nav">
        <NuxtLink to="/enterprise/dashboard" class="ent-nav-item">
          <span class="icon">📊</span> {{ $t('enterprise.dashboard') }}
        </NuxtLink>
        <NuxtLink to="/enterprise/finance/dashboard" class="ent-nav-item">
          <span class="icon">💵</span> {{ $t('enterprise.finance') }}
        </NuxtLink>
        <NuxtLink to="/enterprise/users" class="ent-nav-item">
          <span class="icon">👥</span> {{ $t('enterprise.users') }}
        </NuxtLink>
        <NuxtLink to="/enterprise/customers" class="ent-nav-item">
          <span class="icon">👤</span> {{ $t('enterprise.customers') }}
        </NuxtLink>
        <NuxtLink to="/enterprise/customers/tags" class="ent-nav-item">
          <span class="icon">🏷️</span> {{ $t('enterprise.tags') }}
        </NuxtLink>
        <NuxtLink to="/enterprise/channels" class="ent-nav-item">
          <span class="icon">🔗</span> {{ $t('enterprise.channels') }}
        </NuxtLink>
        <NuxtLink to="/enterprise/distribution" class="ent-nav-item">
          <span class="icon">📢</span> {{ $t('enterprise.distribution') }}
        </NuxtLink>
        <NuxtLink to="/enterprise/commerce" class="ent-nav-item">
          <span class="icon">📦</span> {{ $t('enterprise.commerce') }}
        </NuxtLink>
        <NuxtLink to="/enterprise/reports" class="ent-nav-item">
          <span class="icon">📋</span> {{ $t('enterprise.reports') }}
        </NuxtLink>
        <NuxtLink to="/enterprise/usage" class="ent-nav-item">
          <span class="icon">📈</span> {{ $t('enterprise.usage') }}
        </NuxtLink>
        <NuxtLink to="/enterprise/plans" class="ent-nav-item">
          <span class="icon">💎</span> {{ $t('enterprise.plans') }}
        </NuxtLink>
        <NuxtLink to="/enterprise/whitelabel" class="ent-nav-item">
          <span class="icon">🎨</span> {{ $t('enterprise.whitelabel') }}
        </NuxtLink>
        <NuxtLink to="/enterprise/settings" class="ent-nav-item">
          <span class="icon">⚙️</span> {{ $t('enterprise.settings') }}
        </NuxtLink>
      </nav>
      <div class="ent-footer">
        <button class="ent-theme-btn" @click="toggleTheme" :title="theme === 'dark' ? '切换亮色' : '切换暗色'" :aria-label="theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'">
          {{ theme === 'dark' ? '☀️' : '🌙' }}
        </button>
        <button class="logout-btn" @click="handleLogout">{{ $t('enterprise.logout') }}</button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="ent-main">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const entName = ref('');
const { theme, toggle: toggleTheme } = useTheme();

onMounted(async () => {
  try {
    const data = await $fetch('/api/enterprise/profile', { credentials: 'include' });
    entName.value = data.data?.name || '';
  } catch (e) {
    // 仅 401 未认证才跳转登录，网络波动/5xx 不误清会话
    if (e?.response?.status === 401) {
      router.push('/enterprise/login');
    } else if (!e?.response) {
      console.debug('Enterprise profile network error', e.message);
    }
  }
});

async function handleLogout() {
  try {
    await $fetch('/api/enterprise/logout', { method: 'POST', credentials: 'include' });
  } catch (e) { /* 即使服务端请求失败，也清除本地 cookie */ }
  document.cookie = 'token=; path=/; max-age=0';
  document.cookie = 'refreshToken=; path=/; max-age=0';
  router.push('/enterprise/login');
}
</script>

<style scoped>
.enterprise-layout {
  display: flex;
  min-height: 100vh;
  background: #f5f7fa;
}

.ent-sidebar {
  width: 240px;
  background: #1a1a2e;
  color: #fff;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
}

.ent-brand {
  padding: 24px 20px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.ent-brand h2 {
  font-size: 18px;
  margin: 0;
  cursor: pointer;
  color: #fff;
}

.ent-nav {
  flex: 1;
  padding: 12px 0;
}

.ent-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  transition: all 0.2s;
  font-size: 14px;
}

.ent-nav-item:hover,
.ent-nav-item.router-link-active {
  background: rgba(255,255,255,0.08);
  color: #fff;
}

.ent-nav-item .icon {
  font-size: 18px;
  width: 24px;
}

.ent-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.logout-btn {
  width: 100%;
  padding: 8px;
  background: rgba(255,255,255,0.1);
  border: none;
  color: rgba(255,255,255,0.7);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: rgba(255,77,77,0.3);
  color: #ff6b6b;
}

.ent-main {
  flex: 1;
  margin-left: 240px;
  padding: 32px;
  min-height: 100vh;
}
@media (max-width: 768px) {
  .ent-sidebar { display: none; }
  .ent-main { margin-left: 0; padding: 16px; }
}
</style>

<style>
/* 企业端全局工具类 */
.status-warn { color: #f59e0b; background: #fffbeb; padding: 2px 8px; border-radius: 4px; font-size: 13px; }
.status-ok { color: #10b981; background: #ecfdf5; padding: 2px 8px; border-radius: 4px; font-size: 13px; }
.status-info { color: #3b82f6; background: #eff6ff; padding: 2px 8px; border-radius: 4px; font-size: 13px; }
.status-err { color: #ef4444; background: #fef2f2; padding: 2px 8px; border-radius: 4px; font-size: 13px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 22px; font-weight: 600; color: #1a1a2e; margin: 0; }
.stat-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.stat-num { font-size: 28px; font-weight: 700; color: #1a1a2e; }
.stat-label { font-size: 13px; color: #999; margin-top: 4px; }
.card { background: #fff; border-radius: 10px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.card h3 { font-size: 16px; font-weight: 600; margin: 0 0 16px; color: #1a1a2e; }
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th { text-align: left; padding: 10px 12px; background: #f9fafb; color: #6b7280; font-weight: 500; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
.data-table td { padding: 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
.data-table tr:hover td { background: #f9fafb; }
.empty { text-align: center; color: #999; padding: 40px 0; font-size: 14px; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 16px; font-size: 14px; }
.pagination button { padding: 6px 14px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { padding: 8px 20px; background: #1a73e8; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
.btn-primary:hover { background: #1557b0; }
.btn-cancel { padding: 8px 20px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-size: 14px; }
.btn-sm { padding: 4px 10px; font-size: 12px; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; cursor: pointer; }
.btn-sm:hover { background: #f3f4f6; }
.btn-success { background: #10b981; color: #fff; border-color: #10b981; }
.btn-success:hover { background: #059669; }
.btn-danger { background: #ef4444; color: #fff; border-color: #ef4444; }
.btn-danger:hover { background: #dc2626; margin-left: 6px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 200; }
.modal { background: #fff; border-radius: 12px; padding: 24px; min-width: 400px; max-width: 90vw; }
.modal h3 { margin: 0 0 16px; font-size: 18px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.input { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
.input:focus { outline: none; border-color: #1a73e8; box-shadow: 0 0 0 2px rgba(26,115,232,0.15); }
</style>
