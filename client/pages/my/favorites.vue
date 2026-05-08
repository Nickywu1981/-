<template>
  <div class="favorites-page">
    <div class="page-header">
      <div>
        <h1>我的收藏</h1>
        <p class="subtitle">{{ total }} 个收藏项</p>
      </div>
      <div class="header-actions">
        <button class="btn-outline" @click="activeTab = 'all'" :class="{ active: activeTab === 'all' }">全部</button>
        <button class="btn-outline" @click="activeTab = 'image'" :class="{ active: activeTab === 'image' }">图片</button>
        <button class="btn-outline" @click="activeTab = 'video'" :class="{ active: activeTab === 'video' }">视频</button>
        <button class="btn-outline" @click="activeTab = 'prompt'" :class="{ active: activeTab === 'prompt' }">提示词</button>
      </div>
    </div>

    <LoadingSkeleton v-if="loading" type="card" :rows="3" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="btn-outline" @click="fetchFavorites">重试</button>
    </div>

    <div v-else-if="filtered.length === 0" class="empty-state">
      <span class="empty-icon">💾</span>
      <p>还没有收藏任何内容</p>
      <NuxtLink to="/workbench" class="btn-primary">去发现</NuxtLink>
    </div>

    <div v-else class="favorites-grid">
      <div v-for="item in filtered" :key="item.id" class="favorite-card">
        <div class="card-preview">
          <img v-if="item.thumbnail" :src="item.thumbnail" :alt="item.title" @error="onImgError" />
          <span v-else class="card-placeholder">{{ item.type === 'video' ? '🎬' : '🖼️' }}</span>
          <button class="card-remove" title="取消收藏" @click.stop="removeFavorite(item.id)">×</button>
        </div>
        <div class="card-body">
          <span class="card-type">{{ typeLabel(item.type) }}</span>
          <h3 class="card-title">{{ item.title }}</h3>
          <p class="card-meta">{{ formatDate(item.createdAt) }}</p>
        </div>
      </div>
    </div>

    <div v-if="total > pageSize" class="pagination">
      <button :disabled="page === 1" @click="page--">上一页</button>
      <span>{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
      <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const activeTab = ref('all')
const page = ref(1)
const pageSize = 12
const loading = ref(true)
const error = ref('')
const items = ref<any[]>([])
const total = ref(0)

const filtered = computed(() => {
  if (activeTab.value === 'all') return items.value
  return items.value.filter((i: any) => i.type === activeTab.value)
})

const typeLabel = (t: string) => ({ image: '图片', video: '视频', prompt: '提示词' }[t] || t)

const formatDate = (d: string) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const onImgError = (e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }

const fetchFavorites = async () => {
  loading.value = true
  error.value = ''
  try {
    const { data } = await useFetch('/api/collections', { params: { page: page.value, pageSize } })
    items.value = (data.value as any)?.list || (data.value as any)?.data || []
    total.value = (data.value as any)?.total || items.value.length
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const removeFavorite = async (id: number) => {
  try {
    await $fetch(`/api/collections/${id}`, { method: 'DELETE' })
    items.value = items.value.filter(i => i.id !== id)
    total.value--
  } catch { /* silent */ }
}

watch(page, fetchFavorites)
onMounted(fetchFavorites)
</script>
