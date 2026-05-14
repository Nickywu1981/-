<template>
  <div class="user-workspace-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 class="logo">Movio AI</h1>
        <span class="badge">工作台</span>
      </div>

      <!-- 普通用户菜单 -->
      <nav v-if="activeRole === 'user'" class="nav">
        <div class="nav-group">
          <p class="nav-label">AI 创作</p>
          <NuxtLink to="/work/image" class="nav-item" active-class="active">
            <i class="icon-image"></i> 图片生成
          </NuxtLink>
          <NuxtLink to="/work/video" class="nav-item" active-class="active">
            <i class="icon-video"></i> 视频合成
          </NuxtLink>
          <NuxtLink to="/work/my-templates" class="nav-item" active-class="active">
            <i class="icon-layout"></i> 模板库
          </NuxtLink>
          <NuxtLink to="/work/canvas" class="nav-item" active-class="active">
            <i class="icon-grid"></i> DIY 编辑器
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">我的</p>
          <NuxtLink to="/work/projects" class="nav-item" active-class="active">
            <i class="icon-folder"></i> 项目
          </NuxtLink>
          <NuxtLink to="/assets" class="nav-item" active-class="active">
            <i class="icon-hard-drive"></i> 素材库
          </NuxtLink>
          <NuxtLink to="/work/settings" class="nav-item" active-class="active">
            <i class="icon-settings"></i> 账户设置
          </NuxtLink>
        </div>
      </nav>

      <!-- 代理菜单 -->
      <nav v-if="activeRole === 'agent'" class="nav">
        <div class="nav-group">
          <p class="nav-label">AI 创作</p>
          <NuxtLink to="/work/image" class="nav-item" active-class="active">
            <i class="icon-image"></i> 图片生成
          </NuxtLink>
          <NuxtLink to="/work/video" class="nav-item" active-class="active">
            <i class="icon-video"></i> 视频合成
          </NuxtLink>
          <NuxtLink to="/work/my-templates" class="nav-item" active-class="active">
            <i class="icon-layout"></i> 模板库
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">代理管理</p>
          <NuxtLink to="/agent/team" class="nav-item" active-class="active">
            <i class="icon-users"></i> 下级管理
          </NuxtLink>
          <NuxtLink to="/agent/commission" class="nav-item" active-class="active">
            <i class="icon-dollar-sign"></i> 佣金看板
          </NuxtLink>
          <NuxtLink to="/agent/withdraw" class="nav-item" active-class="active">
            <i class="icon-credit-card"></i> 提现
          </NuxtLink>
          <NuxtLink to="/agent/distribution" class="nav-item" active-class="active">
            <i class="icon-share"></i> 推广链接
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">我的</p>
          <NuxtLink to="/work/projects" class="nav-item" active-class="active">
            <i class="icon-folder"></i> 项目
          </NuxtLink>
          <NuxtLink to="/agent/settings" class="nav-item" active-class="active">
            <i class="icon-settings"></i> 设置
          </NuxtLink>
        </div>
      </nav>

      <!-- 企业菜单 -->
      <nav v-if="activeRole === 'enterprise'" class="nav">
        <div class="nav-group">
          <p class="nav-label">AI 创作</p>
          <NuxtLink to="/work/image" class="nav-item" active-class="active">
            <i class="icon-image"></i> 图片生成
          </NuxtLink>
          <NuxtLink to="/work/video" class="nav-item" active-class="active">
            <i class="icon-video"></i> 视频合成
          </NuxtLink>
          <NuxtLink to="/work/my-templates" class="nav-item" active-class="active">
            <i class="icon-layout"></i> 模板库
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">企业空间</p>
          <NuxtLink to="/enterprise/workspace" class="nav-item" active-class="active">
            <i class="icon-grid"></i> 协作工作区
          </NuxtLink>
          <NuxtLink to="/enterprise/users" class="nav-item" active-class="active">
            <i class="icon-users"></i> 成员管理
          </NuxtLink>
          <NuxtLink to="/enterprise/whitelabel" class="nav-item" active-class="active">
            <i class="icon-bookmark"></i> 品牌素材
          </NuxtLink>
          <NuxtLink to="/enterprise/usage" class="nav-item" active-class="active">
            <i class="icon-activity"></i> 用量看板
          </NuxtLink>
        </div>
        <div class="nav-group">
          <p class="nav-label">我的</p>
          <NuxtLink to="/work/projects" class="nav-item" active-class="active">
            <i class="icon-folder"></i> 项目
          </NuxtLink>
          <NuxtLink to="/enterprise/settings" class="nav-item" active-class="active">
            <i class="icon-settings"></i> 设置
          </NuxtLink>
        </div>
      </nav>
    </aside>

    <main class="main">
      <header class="topbar">
        <!-- 角色切换下拉 -->
        <div v-if="showRoleSwitcher" class="role-switcher">
          <button class="role-btn" :class="{ active: activeRole === 'user' }" @click="switchRole('user')">
            👤 个人
          </button>
          <button v-if="hasAgentRole" class="role-btn" :class="{ active: activeRole === 'agent' }" @click="switchRole('agent')">
            🤝 代理
          </button>
          <button v-if="hasEnterpriseRole" class="role-btn" :class="{ active: activeRole === 'enterprise' }" @click="switchRole('enterprise')">
            🏢 企业
          </button>
        </div>
        <span class="user-info">{{ user?.nickname || user?.username }}</span>
      </header>
      <div class="content">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'

const auth = useAuthStore()
const user = computed(() => auth.user)

const activeRole = ref(user.value?.role || 'user')

const hasAgentRole = computed(() => user.value?.role === 'agent')
const hasEnterpriseRole = computed(() => user.value?.role === 'enterprise')
const showRoleSwitcher = computed(() => hasAgentRole.value || hasEnterpriseRole.value)

function switchRole(role: string) {
  activeRole.value = role
  navigateTo('/work')
}
</script>
