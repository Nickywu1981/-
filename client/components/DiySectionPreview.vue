<template>
  <!-- 横幅 -->
  <div v-if="section.component === 'banner_slider'" class="preview-banner">
    <div v-for="(slide, i) in (config.slides||[{}])" :key="i" class="preview-slide">
      <img v-if="slide.img" :src="slide.img" :alt="'slide '+i" loading="lazy" @error="onImgError" />
      <span v-else>空幻灯片{{ i+1 }}</span>
    </div>
  </div>
  <!-- 文本 -->
  <div v-else-if="section.component === 'text_block'" class="preview-text" :style="{ textAlign: config.align, fontSize: (config.fontSize||14)+'px', color: config.color }">
    {{ config.content || '文本段落' }}
  </div>
  <!-- 标题 -->
  <div v-else-if="section.component === 'title_bar'" class="preview-title" :style="{ textAlign: config.align, background: config.bgColor }">
    <strong :style="{ fontSize: (config.fontSize||18)+'px', color: config.color }">{{ config.title || '标题' }}</strong>
    <small v-if="config.subtitle">{{ config.subtitle }}</small>
  </div>
  <!-- 商品列表 -->
  <div v-else-if="section.component === 'product_list'" class="preview-products">
    <div class="grid" :style="gridStyle(config.columns||2, config.gap||10)">
      <div v-for="(item, i) in (config.items?.length ? config.items : [{name:'示例商品',price:'¥99',img:''}])" :key="i" class="card">
        <img :src="item.img || placeholder" :alt="item.name" loading="lazy" @error="onImgError" />
        <span>{{ item.name }}</span>
        <span v-if="config.showPrice" class="price">{{ item.price }}</span>
      </div>
    </div>
  </div>
  <!-- 图片展示 -->
  <div v-else-if="section.component === 'image_showcase'" class="preview-gallery">
    <div class="grid" :style="gridStyle(config.columns||3, config.gap||8)">
      <img v-for="(img, i) in (config.images?.length ? config.images : [placeholder])" :key="i" :src="img" :style="{ borderRadius: (config.radius||8)+'px' }" loading="lazy" @error="onImgError" />
    </div>
  </div>
  <!-- 视频 -->
  <div v-else-if="section.component === 'video_player'" class="preview-video">
    <video v-if="config.src" :src="config.src" :poster="config.poster" :controls="config.controls !== false" :autoplay="config.autoplay" preload="none" class="w-full" />
    <div v-else class="empty-media">▶ 未设置视频源</div>
  </div>
  <!-- 倒计时 -->
  <div v-else-if="section.component === 'countdown'" class="preview-countdown" :style="{ color: config.color, fontSize: (config.fontSize||24)+'px' }">
    <span v-if="config.title">{{ config.title }}</span>
    <strong v-if="config.endTime">{{ countdown }}</strong>
    <span v-else>未设置结束时间</span>
  </div>
  <!-- 优惠券 -->
  <div v-else-if="section.component === 'coupon_card'" class="preview-coupon">
    <div class="coupon-card" :style="{ borderColor: config.color||'#ff6600', borderRadius: (config.radius||8)+'px' }">
      <strong>{{ config.title || '优惠券' }}</strong>
      <span class="amount">{{ config.amount || '¥?' }}</span>
      <span v-if="config.condition">{{ config.condition }}</span>
    </div>
  </div>
  <!-- 按钮组 -->
  <div v-else-if="section.component === 'button_group'" class="preview-buttons" :style="{ flexDirection: config.direction||'row', gap: (config.gap||12)+'px' }">
    <span v-for="(btn, i) in (config.buttons||[{text:'按钮',color:'#6366f1'}])" :key="i" class="btn-pill" :style="{ background: btn.color||'#6366f1', borderRadius: (config.radius||20)+'px' }">{{ btn.text }}</span>
  </div>
  <!-- 导航栏 -->
  <div v-else-if="section.component === 'nav_bar'" class="preview-nav" :style="{ background: config.bgColor||'#fff', color: config.textColor||'#333' }">
    <span v-for="(item, i) in (config.items||[{text:'首页',icon:'🏠'}])" :key="i" class="nav-chip" :style="{ color: config.textColor||'#333' }">
      <span v-if="item.icon">{{ item.icon }}</span> {{ item.text }}
    </span>
  </div>
  <!-- 热区图片 -->
  <div v-else-if="section.component === 'hotzone_image'" class="preview-hotzone" :style="{ borderRadius: (config.radius||8)+'px' }">
    <img v-if="config.src" :src="config.src" loading="lazy" @error="onImgError" :style="{ borderRadius: (config.radius||8)+'px' }" />
    <div v-else class="empty-media">未设置图片</div>
    <span v-if="(config.zones||[]).length" class="zone-badge">{{ config.zones.length }}个热区</span>
  </div>
  <!-- 表单容器 -->
  <div v-else-if="section.component === 'form_container'" class="preview-form" :style="{ background: config.bgColor||'#fff', borderRadius: (config.radius||8)+'px', padding: (config.padding||16)+'px' }">
    <div v-for="(field, i) in (config.fields||[{label:'示例字段'}])" :key="i" class="form-field">
      <label v-if="field.label" :style="{ fontSize: '12px', color: 'var(--text-muted)' }">{{ field.label }}</label>
      <div class="field-mock">{{ field.placeholder || '请输入' }}</div>
    </div>
    <div class="submit-mock">{{ config.submitText || '提交' }}</div>
  </div>
  <!-- 未知 -->
  <div v-else class="preview-unknown">{{ section.component }}</div>
</template>

<script setup lang="ts">
const props = defineProps<{ section: { component: string; config?: Record<string, any>; visible?: boolean } }>()
const config = computed(() => props.section.config || {})
const placeholder = '/placeholder.svg'

const countdown = computed(() => {
  if (!config.value.endTime) return ''
  const diff = new Date(config.value.endTime).getTime() - Date.now()
  if (diff <= 0) return '已结束'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${d}天 ${h}时 ${m}分`
})

function gridStyle(cols: number, gap: number) {
  return { gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: gap + 'px' }
}

function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = placeholder
}
</script>

<style scoped>
.preview-banner { display: flex; gap: 8px; overflow-x: auto; }
.preview-slide { flex: 0 0 auto; min-width: 120px; padding: 24px 36px; background: var(--bg-hover); border-radius: 6px; text-align: center; font-size: 12px; }
.preview-slide img { height: 60px; object-fit: cover; border-radius: 4px; }
.preview-text { padding: 12px 16px; line-height: 1.5; }
.preview-title { padding: 12px 16px; border-radius: 6px; }
.preview-title strong { display: block; }
.preview-title small { font-size: 12px; color: var(--text-muted); }
.preview-products .grid { display: grid; }
.preview-products .card { text-align: center; padding: 4px; }
.preview-products .card img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 6px; background: var(--bg-hover); }
.preview-products .card .price { display: block; color: var(--danger); font-weight: 600; font-size: 13px; }
.preview-gallery .grid { display: grid; }
.preview-gallery img { width: 100%; object-fit: cover; background: var(--bg-hover); aspect-ratio: 1; }
.preview-video video, .preview-hotzone img { width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px; }
.empty-media { padding: 30px 20px; text-align: center; color: var(--text-muted); background: var(--bg-hover); border-radius: 6px; font-size: 13px; }
.preview-countdown { text-align: center; padding: 16px; }
.preview-countdown strong { display: block; margin-top: 4px; font-size: 1.3em; }
.preview-coupon { padding: 8px; }
.coupon-card { padding: 12px; border: 2px dashed; display: flex; flex-direction: column; gap: 4px; }
.coupon-card .amount { font-size: 22px; font-weight: 700; }
.preview-buttons { display: flex; justify-content: center; padding: 12px; }
.btn-pill { display: inline-block; padding: 6px 18px; color: #fff; font-weight: 600; font-size: 13px; }
.preview-nav { display: flex; gap: 8px; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-light); overflow-x: auto; }
.nav-chip { font-size: 11px; white-space: nowrap; }
.preview-hotzone { position: relative; }
.zone-badge { position: absolute; top: 6px; right: 6px; background: rgba(99,102,241,0.8); color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
.preview-form { border: 1px solid var(--border-light); }
.form-field { margin-bottom: 8px; }
.field-mock { padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-hover); font-size: 12px; color: var(--text-muted); margin-top: 3px; }
.submit-mock { text-align: center; padding: 8px; background: var(--brand); color: #fff; border-radius: 6px; margin-top: 8px; font-size: 13px; font-weight: 600; }
.preview-unknown { padding: 20px; text-align: center; color: var(--text-muted); background: var(--bg-hover); border-radius: 6px; font-size: 12px; }
.w-full { width: 100%; }
</style>
