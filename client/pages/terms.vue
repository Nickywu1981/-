<template>
  <div class="legal-page">
    <h1>服务条款</h1>
    <p class="update-date">最后更新: 2026年5月</p>
    <section v-for="s in sections" :key="s.title">
      <h2>{{ s.title }}</h2>
      <p>{{ s.content }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
const sections = [
  { title: '1. 服务说明', content: 'Movio AI 是一款基于人工智能的电商视觉创作平台，提供图像处理、视频生成、批量任务等在线服务。使用本服务即表示您同意本条款。' },
  { title: '2. 账户责任', content: '您对账户下的所有活动负责，请妥善保管登录凭证。不得将账户转借他人使用，不得利用本服务从事违法活动。' },
  { title: '3. 内容规范', content: '您上传的内容不得侵犯第三方知识产权，不得包含违法、暴力、色情等不良信息。Movio AI 有权对违规内容进行移除处理。' },
  { title: '4. 知识产权', content: '您通过 Movio AI 生成的内容，知识产权归您所有。Movio AI 保留对平台技术、算法模型的所有权利。' },
  { title: '5. 服务可用性', content: '我们尽力保证服务的稳定运行，但不承诺 100% 可用。因系统维护、网络故障等导致的服务中断，我们不承担赔偿责任。' },
  { title: '6. 付费与退款', content: '付费套餐按照定价页面所示价格执行。虚拟商品一经使用不支持退款，未使用的套餐可在购买后 7 日内申请退款。' },
  { title: '7. 免责声明', content: 'AI 生成结果可能存在偏差，用户应自行判断生成内容的准确性和适用性。Movio AI 不对 AI 生成内容引发的商业损失承担责任。' },
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
