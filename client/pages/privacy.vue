<template>
  <div class="legal-page">
    <h1>隐私政策</h1>
    <p class="update-date">最后更新: 2026年5月</p>
    <section v-for="s in sections" :key="s.title">
      <h2>{{ s.title }}</h2>
      <p>{{ s.content }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
const sections = [
  { title: '1. 信息收集', content: '我们收集您在使用 Movio AI 服务时主动提供的信息，包括账户注册信息（用户名、手机号、邮箱）、上传的图片和视频素材、以及使用过程中产生的操作日志。' },
  { title: '2. 信息使用', content: '收集的信息用于提供、维护和改进我们的 AI 创作服务，包括图像处理、视频生成、批量任务等核心功能。我们不会将您的素材用于 AI 模型训练。' },
  { title: '3. 信息存储', content: '您的数据存储在位于中国的云服务器上，采用加密存储和传输。上传的素材在任务完成后保留 30 天，您可随时在账户设置中手动删除。' },
  { title: '4. 信息共享', content: '未经您的明确同意，我们不会向第三方共享您的个人信息或创作素材，法律法规要求披露的情况除外。' },
  { title: '5. Cookie 使用', content: '我们使用必要的 Cookie 来维持登录状态和用户偏好设置。您可以在浏览器设置中管理 Cookie 偏好。' },
  { title: '6. 用户权利', content: '您有权访问、更正、删除您的个人信息，有权撤回同意和注销账户。如有需求，请联系 support@movio.ai。' },
]
</script>

<style scoped>
.legal-page { max-width: 800px; margin: 0 auto; padding: var(--space-8) var(--space-4); }
.legal-page h1 { font-size: 2rem; color: var(--text-primary); margin-bottom: var(--space-2); }
.update-date { color: var(--text-muted); margin-bottom: var(--space-8); }
section { margin-bottom: var(--space-6); }
section h2 { font-size: 1.1rem; color: var(--text-primary); margin-bottom: var(--space-2); }
section p { color: var(--text-secondary); line-height: 1.8; }
</style>
