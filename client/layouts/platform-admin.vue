<template>
  <div class="platform-admin-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 class="logo">Movio AI</h1>
        <span class="badge">总后台</span>
      </div>
      <nav class="nav">
        <div class="nav-group">
          <p class="nav-label">系统管控</p>
          <NuxtLink to="/admin/dashboard" class="nav-item" active-class="active">
            <i class="icon-dashboard"></i> 总览面板
          </NuxtLink>
          <NuxtLink to="/admin/users" class="nav-item" active-class="active">
            <i class="icon-users"></i> 租户管理
          </NuxtLink>
          <NuxtLink to="/admin/tenants" class="nav-item" active-class="active">
            <i class="icon-building"></i> 租户开关
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">底层网关</p>
          <NuxtLink to="/gateway/models" class="nav-item" active-class="active">
            <i class="icon-cpu"></i> 模型供应商
          </NuxtLink>
          <NuxtLink to="/gateway/dispatch" class="nav-item" active-class="active">
            <i class="icon-shuffle"></i> 调度策略
          </NuxtLink>
          <NuxtLink to="/gateway/hooks" class="nav-item" active-class="active">
            <i class="icon-zap"></i> Hook 注册
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">安全与审计</p>
          <NuxtLink to="/admin/security" class="nav-item" active-class="active">
            <i class="icon-shield"></i> WAF / 密钥
          </NuxtLink>
          <NuxtLink to="/admin/audit" class="nav-item" active-class="active">
            <i class="icon-file-text"></i> 审计日志
          </NuxtLink>
          <NuxtLink to="/admin/system" class="nav-item" active-class="active">
            <i class="icon-settings"></i> 系统参数
          </NuxtLink>
        </div>
      </nav>
    </aside>
    <main class="main">
      <header class="topbar">
        <span class="env-badge">🔒 内网环境</span>
        <span class="user-info">{{ user?.username || '超管' }}</span>
      </header>
      <div class="content">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const { user } = useAuth()
</script>
