<template>
  <div class="diy-preview-page">
    <div v-if="loading" class="loading-skeleton">
      <div class="skeleton-bar w-60"></div>
      <div class="skeleton-block"></div>
      <div class="skeleton-block h-200"></div>
    </div>
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-outline" @click="retry">重试</button>
    </div>
    <div v-else class="preview-container" :class="pageType">
      <div class="page-title-bar">
        <span>{{ page?.title || '预览' }}</span>
        <div class="device-switch">
          <button :class="{ active: viewMode === 'mobile' }" @click="viewMode = 'mobile'" aria-label="移动端预览">📱</button>
          <button :class="{ active: viewMode === 'pc' }" @click="viewMode = 'pc'" aria-label="PC端预览">🖥️</button>
        </div>
      </div>
      <div class="canvas-frame" :class="viewMode">
        <div v-for="section in sections" :key="section.id" class="page-section" :data-component="section.component">
          <!-- Banner/Slider -->
          <div v-if="section.component === 'banner_slider'" class="sec-banner">
            <div class="banner-slide" v-for="(slide, i) in section.config.slides" :key="i">
              <img :src="slide.img || '/placeholder.svg'" :alt="'slide '+i" loading="lazy" />
            </div>
          </div>
          <!-- Text -->
          <div v-else-if="section.component === 'text_block'" class="sec-text" :style="textBlockStyle(section.config)">
            {{ section.config.content || '文本内容' }}
          </div>
          <!-- Title -->
          <div v-else-if="section.component === 'title_bar'" class="sec-title" :style="{ textAlign: section.config.align }">
            <h2>{{ section.config.title }}</h2>
            <p v-if="section.config.subtitle">{{ section.config.subtitle }}</p>
          </div>
          <!-- Product Grid -->
          <div v-else-if="section.component === 'product_list'" class="sec-products">
            <div class="product-grid" :style="gridStyle(section.config.columns || 2, 0)">
              <div v-for="item in (section.config.items?.length ? section.config.items : [{name:'示例商品',price:'¥99',img:''}])" :key="item.name" class="product-card">
                <img :src="item.img || '/placeholder.svg'" :alt="item.name" loading="lazy" />
                <span class="p-name">{{ item.name }}</span>
                <span v-if="section.config.showPrice" class="p-price">{{ item.price }}</span>
              </div>
            </div>
          </div>
          <!-- Image Showcase -->
          <div v-else-if="section.component === 'image_showcase'" class="sec-gallery">
            <div class="gallery-grid" :style="gridStyle(section.config.columns || 3, section.config.gap || 8)">
              <img v-for="(img, i) in (section.config.images?.length ? section.config.images : ['/placeholder.svg'])" :key="i" :src="img" :style="{ borderRadius: (section.config.radius||8)+'px' }" loading="lazy" />
            </div>
          </div>
          <!-- Video -->
          <div v-else-if="section.component === 'video_player'" class="sec-video">
            <video :src="section.config.src" :poster="section.config.poster" :autoplay="section.config.autoplay" :controls="section.config.controls !== false" preload="none" class="w-full"></video>
          </div>
          <!-- Countdown -->
          <div v-else-if="section.component === 'countdown'" class="sec-countdown" :style="{ color: section.config.color }">
            <span>{{ section.config.title }}</span>
            <strong>{{ countdownText(section.config.endTime) }}</strong>
          </div>
          <!-- Coupon -->
          <div v-else-if="section.component === 'coupon_card'" class="sec-coupon">
            <h3>{{ section.config.title }}</h3>
            <div v-for="c in section.config.coupons" :key="c.id" class="coupon-item">{{ c.name }} - {{ c.discount }}</div>
          </div>
          <!-- Buttons -->
          <div v-else-if="section.component === 'button_group'" class="sec-buttons" :style="{ flexDirection: section.config.direction, gap: (section.config.gap||12)+'px' }">
            <a v-for="(btn, i) in section.config.buttons" :key="i" :href="btn.link||'#'" class="diy-btn" :style="{ background: btn.color||'var(--brand)' }">{{ btn.text }}</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const page = ref(null)
const sections = ref([])
const error = ref('')
const loading = ref(true)
const viewMode = ref('mobile')
const pageType = computed(() => viewMode.value)

function countdownText(endTime: string) {
  if (!endTime) return ''
  const diff = new Date(endTime).getTime() - Date.now()
  if (diff <= 0) return '已结束'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${d}天 ${h}时 ${m}分`
}

function textBlockStyle(c: Record<string, any>) {
  const s: Record<string, string> = {}
  if (c.align) s.textAlign = c.align
  if (c.fontSize) s.fontSize = c.fontSize + 'px'
  if (c.color) s.color = c.color
  return s
}

function gridStyle(cols: number, gap: number) {
  const s: Record<string, string> = { gridTemplateColumns: `repeat(${cols}, 1fr)` }
  if (gap) s.gap = gap + 'px'
  return s
}

async function loadPage() {
  loading.value = true
  error.value = ''
  try {
    const slug = route.query.slug || 'product-detail-demo'
    const res = await $fetch(`/api/diy/published/${slug}`)
    page.value = res.data
    const config = typeof res.data?.config_json === 'string' ? JSON.parse(res.data.config_json) : res.data?.config_json
    sections.value = config?.sections || []
  } catch (e: any) {
    error.value = '页面加载失败: ' + (e.data?.msg || e.message)
  } finally { loading.value = false }
}

function retry() { loadPage() }

onMounted(loadPage)
</script>

<style scoped>
.diy-preview-page { max-width: 100%; margin: 0 auto; }
.loading-skeleton { max-width: 414px; margin: 40px auto; padding: 20px; }
.skeleton-bar { height: 16px; background: var(--bg-hover); border-radius: 4px; margin-bottom: 16px; animation: shimmer 1.5s infinite; }
.skeleton-bar.w-60 { width: 60%; }
.skeleton-block { height: 100px; background: var(--bg-hover); border-radius: 8px; margin-bottom: 12px; animation: shimmer 1.5s infinite; }
.skeleton-block.h-200 { height: 200px; }
@keyframes shimmer { 0% { opacity: .5; } 50% { opacity: 1; } 100% { opacity: .5; } }
.error-state { text-align: center; padding: 80px 20px; color: var(--text-muted); }
.error-state .btn { margin-top: 16px; }
.page-title-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: var(--bg-card); border-bottom: 1px solid var(--border-light); }
.device-switch button { padding: 6px 12px; border: 1px solid var(--border-light); background: var(--bg-card); cursor: pointer; border-radius: 4px; margin-left: 6px; }
.device-switch button.active { background: var(--brand); border-color: var(--brand); }
.canvas-frame.mobile { max-width: 414px; margin: 20px auto; border: 1px solid var(--border-light); border-radius: 16px; overflow: hidden; min-height: 600px; }
.canvas-frame.pc { max-width: 1200px; margin: 20px auto; }
.page-section { margin-bottom: 12px; }
.sec-banner img { width: 100%; display: block; }
.sec-text { padding: 16px; }
.sec-title { padding: 20px 16px 10px; }
.sec-title h2 { font-size: 20px; margin: 0; }
.sec-title p { font-size: 13px; color: var(--text-muted); margin: 4px 0 0; }
.product-grid { display: grid; padding: 0 12px; }
.product-card { text-align: center; padding: 8px; }
.product-card img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; background: var(--bg-hover); }
.p-name { display: block; font-size: 13px; margin-top: 6px; }
.p-price { display: block; font-size: 15px; font-weight: 700; color: var(--danger); }
.sec-gallery { padding: 0 12px; }
.gallery-grid { display: grid; }
.gallery-grid img { width: 100%; object-fit: cover; background: var(--bg-hover); }
.sec-video { padding: 0; }
.w-full { width: 100%; }
.sec-countdown { text-align: center; padding: 20px; font-size: 16px; }
.sec-countdown strong { display: block; font-size: 24px; margin-top: 4px; }
.sec-coupon { padding: 16px; }
.sec-coupon h3 { font-size: 18px; margin-bottom: 10px; }
.coupon-item { padding: 10px; background: var(--danger-light, #fff5f5); border: 1px dashed var(--danger); border-radius: 8px; margin-bottom: 8px; }
.sec-buttons { display: flex; justify-content: center; padding: 16px; }
.diy-btn { display: inline-block; padding: 10px 28px; color: #fff; border-radius: 20px; text-decoration: none; font-weight: 600; background: var(--brand-gradient); }
.btn { padding: 8px 16px; border-radius: 6px; font-size: 14px; cursor: pointer; border: none; }
.btn-outline { background: var(--bg-card); border: 1px solid var(--border-light); color: var(--text-primary); }
</style>
