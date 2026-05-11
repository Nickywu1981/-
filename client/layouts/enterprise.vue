<template>
  <div class="enterprise-layout">
    <!-- 侧边栏 -->
    <aside class="ent-sidebar">
      <div class="ent-brand">
        <h2 @click="navigateTo('/enterprise/dashboard')">{{ entName || '企业中心' }}</h2>
      </div>
      <nav class="ent-nav">
        <NuxtLink to="/enterprise/dashboard" class="ent-nav-item">
          <span class="icon">📊</span> 工作台
        </NuxtLink>
        <NuxtLink to="/enterprise/finance/dashboard" class="ent-nav-item">
          <span class="icon">💵</span> 财务管理
        </NuxtLink>
        <NuxtLink to="/enterprise/users" class="ent-nav-item">
          <span class="icon">👥</span> 子账号管理
        </NuxtLink>
        <NuxtLink to="/enterprise/usage" class="ent-nav-item">
          <span class="icon">📈</span> 用量明细
        </NuxtLink>
        <NuxtLink to="/enterprise/plans" class="ent-nav-item">
          <span class="icon">💎</span> 套餐管理
        </NuxtLink>
        <NuxtLink to="/enterprise/whitelabel" class="ent-nav-item">
          <span class="icon">🎨</span> 白标设置
        </NuxtLink>
        <NuxtLink to="/enterprise/settings" class="ent-nav-item">
          <span class="icon">⚙️</span> 账户设置
        </NuxtLink>
      </nav>
      <div class="ent-footer">
        <button class="logout-btn" @click="handleLogout">退出登录</button>
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

onMounted(async () => {
  try {
    const data = await $fetch('/api/enterprise/profile', { credentials: 'include' });
    entName.value = data.data?.name || '';
  } catch (e) {
    // 仅 401 未认证才跳转登录，网络波动/5xx 不误清会话
    if (e?.response?.status === 401) {
      router.push('/enterprise/login');
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
</style>
