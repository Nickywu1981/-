import { useToast } from '#imports'
const toast = useToast()
<template>
  <div class="diy-page">
    <h1>自定义页面设计</h1>
    <p class="subtitle">拖拽式搭建商品详情页/活动页/专题页，所见即所得</p>
    <LoadingSkeleton v-if="loading" type="card" :rows="3" />
    <div v-else-if="templates.length" class="diy-grid">
      <div v-for="tpl in templates" :key="tpl.id" class="diy-card" @click="editTemplate(tpl)">
        <div class="diy-card__preview" :style="{ background: tpl.color || '#F5F3FF' }">
          <span class="diy-card__icon">{{ tpl.icon || '📄' }}</span>
        </div>
        <div class="diy-card__info"><div class="diy-card__name">{{ tpl.title || tpl.name }}</div><div class="diy-card__desc">{{ tpl.description || tpl.desc || '自定义页面' }}</div></div>
      </div>
    </div>
    <div class="diy-create"><button class="btn btn-primary" @click="createNew">+ 创建空白页面</button></div>
  </div>
</template>
<script setup lang="ts">
const templates = ref<any[]>([])
const loading = ref(true)
const router = useRouter()

onMounted(async () => {
  try {
    const data: any = await $fetch('/api/diy', { credentials: 'include' })
    templates.value = data?.data?.list || data?.data || []
    if (!Array.isArray(templates.value)) templates.value = []
  } catch(e) { toast.error('加载失败') }
  loading.value = false
})

const editTemplate = (tpl: any) => { router.push(`/diy/editor?id=${tpl.id}`) }
const createNew = () => { router.push('/diy/editor') }
</script>
<style scoped>
.diy-page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
.subtitle { color: var(--text-secondary); margin-bottom: 32px; }
.diy-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.diy-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; overflow: hidden; cursor: pointer; transition: all .2s; }
.diy-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); transform: translateY(-2px); }
.diy-card__preview { height: 140px; display: flex; align-items: center; justify-content: center; }
.diy-card__icon { font-size: 48px; }
.diy-card__info { padding: 16px; }
.diy-card__name { font-weight: 600; margin-bottom: 4px; }
.diy-card__desc { font-size: 13px; color: var(--text-muted); }
.diy-create { margin-top: 32px; text-align: center; }
.btn { padding: 12px 32px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); font-size: 15px; cursor: pointer; font-weight: 600; }
.btn:hover { opacity: 0.9; }
</style>
