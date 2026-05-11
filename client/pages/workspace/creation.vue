<!-- Movio AI v6.0 — 创作页：顶部标签 + 输入区 + 工具卡片宫格 -->
<template>
  <div class="wc">
    <!-- ═══ 顶部横向标签栏 ═══ -->
    <div class="wc-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="wc-tab"
        :class="{ sel: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ═══ 输入区 ═══ -->
    <div class="wc-input">
      <textarea
        v-model="prompt"
        class="wc-textarea"
        :placeholder="activeTabPlaceholder"
        rows="3"
        @keydown.enter.exact.prevent="handleSubmit"
      ></textarea>
      <div class="wc-input-actions">
        <span class="wc-hint">{{ activeTabHint }}</span>
        <button class="wc-submit" :disabled="!prompt.trim()" @click="handleSubmit">
          {{ $t('workspace.start_create') }} →
        </button>
      </div>
    </div>

    <!-- ═══ 当前标签下的工具卡片宫格 ═══ -->
    <div v-if="loading" class="wc-loading">
      <div class="spinner" />
      <p>{{ $t('workspace.loading_tools') }}</p>
    </div>
    <div v-else class="wc-section">
      <div class="wc-sec-hd">
        <h3 class="wc-sec-title">{{ activeTabLabel }} · {{ $t('workspace.creation_tools') }}</h3>
        <button class="wc-sec-more" @click="go(allCardsRoute)">{{ $t('workspace.view_all') }} →</button>
      </div>
      <div class="wc-grid">
        <div
          v-for="card in activeCards"
          :key="card.id"
          class="wc-card"
          @click="go(card.route)"
        >
          <div class="wc-card-icon">{{ card.icon }}</div>
          <h4 class="wc-card-title">{{ card.title }}</h4>
          <p class="wc-card-desc">{{ card.desc }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
type Card = { id: string; category: string; icon: string; title: string; desc: string; route: string; order: number; visible: boolean }

const defaultCardData: Record<string, Card[]> = {
  video: [
    { id:'video_gen', category:'video', icon:'🎥', title:'AI 短视频', desc:'商品图一键生成带货短视频', route:'/work/video', order:1, visible:true },
    { id:'video_edit', category:'video', icon:'✂', title:'视频编辑', desc:'在线剪辑/加字幕/配乐/调色', route:'/work/video-edit', order:2, visible:true },
    { id:'video_trans', category:'video', icon:'🌐', title:'视频翻译', desc:'语音/字幕/面容三合一翻译', route:'/work/video-translate', order:3, visible:true },
    { id:'script_gen', category:'video', icon:'📝', title:'短视频脚本', desc:'带货视频口播脚本自动生成', route:'/work/script-gen', order:4, visible:true },
    { id:'shot_plan', category:'video', icon:'📐', title:'分镜计划', desc:'视频分镜/镜头顺序/时长规划', route:'/work/shot-plan', order:5, visible:true },
    { id:'storyboard', category:'video', icon:'🎞', title:'故事板', desc:'视频创意可视化故事板预览', route:'/work/storyboard', order:6, visible:true },
  ],
  image: [
    { id:'img_main', category:'image', icon:'🖼', title:'AI 商品图', desc:'各平台商品主图一键生成', route:'/work/image', order:1, visible:true },
    { id:'img_scene', category:'image', icon:'🏞', title:'场景图生成', desc:'商品融入生活场景展示', route:'/work/main-image', order:2, visible:true },
    { id:'img_poster', category:'image', icon:'📰', title:'海报生成', desc:'营销海报/活动海报/首发海报', route:'/work/poster', order:3, visible:true },
    { id:'img_white_bg', category:'image', icon:'⬜', title:'白底图生成', desc:'符合各平台规范的白底图', route:'/work/white-bg', order:4, visible:true },
    { id:'img_bg_remove', category:'image', icon:'✂', title:'智能去背景', desc:'AI 3秒精准识别主体去背景', route:'/work/remove-bg', order:5, visible:true },
    { id:'img_retouch', category:'image', icon:'✨', title:'AI 精修', desc:'调色/锐化/光影质感优化', route:'/work/retouch', order:6, visible:true },
    { id:'img_recolor', category:'image', icon:'🎯', title:'商品换色', desc:'同一款式展示多种颜色', route:'/work/color-swap', order:7, visible:true },
    { id:'img_style', category:'image', icon:'🖌', title:'风格迁移', desc:'实拍图变油画/水彩/3D风格', route:'/work/style-transfer', order:8, visible:true },
    { id:'img_text_fx', category:'image', icon:'🔤', title:'文字特效', desc:'立体/金属/霓虹等标题特效', route:'/work/text-effect', order:9, visible:true },
    { id:'img_expand', category:'image', icon:'↔', title:'智能外扩', desc:'画面边缘智能扩展补全', route:'/work/outpaint', order:10, visible:true },
    { id:'batch_process', category:'image', icon:'📦', title:'批量处理', desc:'50张图统一抠图+白底+尺寸', route:'/work/batch', order:11, visible:true },
  ],
  detail: [
    { id:'detail_page', category:'detail', icon:'📄', title:'详情页设计', desc:'商品详情页智能排版设计', route:'/work/detail-page', order:1, visible:true },
    { id:'product_render', category:'detail', icon:'🛒', title:'产品渲染', desc:'3D展示商品旋转/细节', route:'/work/product-render', order:2, visible:true },
    { id:'virtual_tryon', category:'detail', icon:'👗', title:'虚拟试穿', desc:'买家在线看衣服上身效果', route:'/work/virtual-tryon', order:3, visible:true },
    { id:'model_generate', category:'detail', icon:'🧍', title:'AI 模特', desc:'AI 生成虚拟模特穿衣展示', route:'/work/model-generate', order:4, visible:true },
    { id:'img_ghost', category:'detail', icon:'👤', title:'幽灵模特', desc:'隐形模特展示上身效果', route:'/work/ghost-mannequin', order:5, visible:true },
    { id:'platform_taobao', category:'detail', icon:'📱', title:'多平台适配', desc:'天猫/京东/拼多多等尺寸适配', route:'/work/multi-platform', order:6, visible:true },
    { id:'main_img_set', category:'detail', icon:'🖼', title:'主图套装', desc:'主图+辅图+白底图一键套装', route:'/work/main-image-set', order:7, visible:true },
    { id:'output', category:'detail', icon:'📁', title:'导出设置', desc:'统一导出格式/尺寸/命名规则', route:'/work/output', order:8, visible:true },
  ],
  copywrite: [
    { id:'copy_title', category:'copywrite', icon:'📋', title:'电商标题', desc:'SEO优化标题/卖点标题批量生成', route:'/work/title-gen', order:1, visible:true },
    { id:'copy_detail', category:'copywrite', icon:'📝', title:'详情文案', desc:'商品详情页长文案智能撰写', route:'/work/detail-copy', order:2, visible:true },
    { id:'script_gen2', category:'copywrite', icon:'🎙', title:'口播脚本', desc:'带货短视频口播脚本自动生成', route:'/work/script-gen', order:3, visible:true },
    { id:'campaign_copy', category:'copywrite', icon:'📢', title:'营销文案', desc:'大促/活动/促销文案生成', route:'/work/campaign-copy', order:4, visible:true },
    { id:'email_copy', category:'copywrite', icon:'📧', title:'邮件文案', desc:'EDM营销邮件/短信文案', route:'/work/email-copy', order:5, visible:true },
    { id:'social_copy', category:'copywrite', icon:'📱', title:'社媒文案', desc:'小红书/抖音/TikTok文案', route:'/work/social-copy', order:6, visible:true },
  ],
  digital: [
    { id:'digital_human', category:'digital', icon:'🤖', title:'数字人带货', desc:'数字人24小时自动带货视频', route:'/work/digital-human', order:1, visible:true },
    { id:'digital_live', category:'digital', icon:'📡', title:'数字人直播', desc:'虚拟直播间自动讲解商品', route:'/work/digital-live', order:2, visible:true },
    { id:'avatar_custom', category:'digital', icon:'🧬', title:'形象定制', desc:'自定义数字人外观/声音/动作', route:'/work/avatar-custom', order:3, visible:true },
    { id:'ai_host', category:'digital', icon:'🎤', title:'AI 主播', desc:'智能语音播报商品卖点', route:'/work/ai-host', order:4, visible:true },
    { id:'virtual_model', category:'digital', icon:'👤', title:'虚拟模特', desc:'AI生成虚拟模特穿衣展示', route:'/work/virtual-model', order:5, visible:true },
    { id:'face_swap', category:'digital', icon:'🔄', title:'换脸', desc:'AI 人脸替换/数字人换脸', route:'/work/face-swap', order:6, visible:true },
  ],
}
</script>

<script setup lang="ts">
definePageMeta({ layout: 'workspace' })
const router = useRouter()

const prompt = ref('')
const activeTab = ref('')
const loading = ref(true)

const tabs = ref<{ key: string; label: string }[]>([])
const cardData = ref<Record<string, Card[]>>({})

onMounted(async () => {
  try {
    const cfg: any = await $fetch('/api/site-config/public')
    if (cfg?.workspace_cards && Array.isArray(cfg.workspace_cards)) {
      const cards: Card[] = cfg.workspace_cards.filter((c: Card) => c.visible !== false)
      // 提取唯一 category 作为 tabs
      const seen = new Set<string>()
      const t: { key: string; label: string }[] = []
      cards.forEach((c: Card) => {
        if (!seen.has(c.category)) {
          seen.add(c.category)
          t.push({ key: c.category, label: c.category })
        }
      })
      // 分组 cards
      const groups: Record<string, Card[]> = {}
      cards.forEach((c: Card) => {
        if (!groups[c.category]) groups[c.category] = []
        groups[c.category].push(c)
      })
      const tabKeys = ["video", "image", "detail", "copywrite", "digital"]
      tabs.value = t.length > 0 ? t : tabKeys.map(key => ({ key, label: t(`workspace.creation_tabs.${key}`) }))
      cardData.value = Object.keys(groups).length > 0 ? groups : defaultCardData
    } else {
      throw new Error('empty')
    }
  } catch (e: any) {
    console.error('[创作页] 配置加载失败，使用默认卡片', e.message)
    const tabKeys = ["video", "image", "detail", "copywrite", "digital"]
    tabs.value = tabKeys.map(key => ({ key, label: t(`workspace.creation_tabs.${key}`) }))
    cardData.value = defaultCardData
  } finally {
    loading.value = false
  }
  if (tabs.value.length > 0 && !activeTab.value) {
    activeTab.value = tabs.value[0].key
  }
})

function go(path: string) { router.push(path) }

const activeTabLabel = computed(() => tabs.value.find(t => t.key === activeTab.value)?.label || '')
const { t } = useI18n()

const activeTabPlaceholder = computed(() => {
  const key = `workspace.creation_placeholder_${activeTab.value}` as string
  const fallback = t('workspace.creation_placeholder_default')
  return t(key) !== key ? t(key) : fallback
})
const activeTabHint = computed(() => {
  const key = `workspace.creation_hint_${activeTab.value}` as string
  return t(key) !== key ? t(key) : ''
})

const activeCards = computed(() => cardData.value[activeTab.value] || Object.values(cardData.value)[0] || [])

const allCardsRoute = computed(() => {
  const map: Record<string, string> = { video: '/work/video', image: '/work/image', detail: '/work/detail-page', copywrite: '/work/copywriting', digital: '/work/digital-human' }
  return map[activeTab.value] || '/workspace/creation'
})

async function handleSubmit() {
  if (!prompt.value.trim()) return
  const tab = activeTab.value
  const routes: Record<string, string> = {
    image: '/work/image',
    video: '/work/video',
    detail: '/work/detail-page',
    copywrite: '/work/copywrite',
    digital: '/work/digital-human',
  }
  const target = routes[tab] || '/work/image'
  router.push({ path: target, query: { prompt: prompt.value } })
}
</script>

<style scoped>
.wc { max-width: 1100px; margin: 0 auto; padding: 24px 28px; }

/* ═══ Tabs ═══ */
.wc-tabs { display: flex; gap: 4px; margin-bottom: 20px; flex-wrap: wrap; }
.wc-tab {
  padding: 7px 16px; border-radius: 8px; font-size: 13px; background: none; border: none;
  color: var(--tx2, #6b6b70); cursor: pointer; transition: background 0.15s, color 0.15s;
}
.wc-tab:hover { background: rgba(0,0,0,0.04); color: var(--tx, #171717); }
.wc-tab:focus-visible { outline: 2px solid var(--brand, #5b5fe3); outline-offset: 2px; border-radius: 4px; }
.wc-tab.sel { background: var(--brand, #5b5fe3); color: #fff; }

/* ═══ Input ═══ */
.wc-input { background: #fff; border-radius: 14px; padding: 18px; border: 1px solid var(--brd, #ebebea); box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 28px; }
.wc-textarea {
  width: 100%; border: none; resize: none; font-size: 14px; line-height: 1.6; color: var(--tx, #171717);
  font-family: inherit; outline: none; background: none;
}
.wc-textarea:focus-visible {
  outline: 2px solid var(--brand, #5b5fe3);
  outline-offset: 2px;
  border-radius: 4px;
}
.wc-textarea::placeholder { color: var(--tx3, #9d9da3); }
.wc-input-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.wc-hint { font-size: 11px; color: var(--tx3, #9d9da3); }
.wc-submit {
  padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none;
  background: var(--brand, #5b5fe3); color: #fff; cursor: pointer; transition: opacity 0.15s, transform 0.15s;
}
.wc-submit:hover { opacity: 0.85; transform: scale(1.02); }
.wc-submit:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

/* ═══ Grid ═══ */
.wc-section { }
.wc-sec-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.wc-sec-title { font-size: 14px; font-weight: 500; color: var(--tx, #171717); }
.wc-sec-more { font-size: 12px; color: var(--tx3, #9d9da3); background: none; border: none; cursor: pointer; }
.wc-sec-more:hover { color: var(--tx, #171717); }
.wc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.wc-card {
  background: #fff; border-radius: 11px; padding: 18px 16px; border: 1px solid var(--brd, #ebebea);
  cursor: pointer; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}
.wc-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); border-color: #d4d4d4; }
.wc-card:focus-visible { outline: 2px solid var(--brand, #5b5fe3); outline-offset: 2px; }
.wc-card-icon { font-size: 24px; margin-bottom: 8px; }
.wc-card-title { font-size: 13px; font-weight: 500; color: var(--tx, #171717); margin-bottom: 4px; }
.wc-card-desc { font-size: 12px; color: var(--tx3, #9d9da3); line-height: 1.4; }

@media (max-width: 1000px) { .wc-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 700px) { .wc-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .wc-grid { grid-template-columns: 1fr; } }

.wc-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: var(--tx2, #6b6b70); font-size: 13px; gap: 12px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--brd, #ebebea); border-top-color: var(--brand, #5b5fe3); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
