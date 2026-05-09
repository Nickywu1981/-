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
          开始创作 →
        </button>
      </div>
    </div>

    <!-- ═══ 当前标签下的工具卡片宫格 ═══ -->
    <div class="wc-section">
      <div class="wc-sec-hd">
        <h3 class="wc-sec-title">{{ activeTabLabel }} · 创作工具</h3>
        <button class="wc-sec-more">查看全部 →</button>
      </div>
      <div class="wc-grid">
        <div
          v-for="card in activeCards"
          :key="card.path"
          class="wc-card"
          @click="go(card.path)"
        >
          <div class="wc-card-icon">{{ card.icon }}</div>
          <h4 class="wc-card-title">{{ card.name }}</h4>
          <p class="wc-card-desc">{{ card.desc }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
const router = useRouter()
const toast = useToast()

const prompt = ref('')
const activeTab = ref('image')

function go(path: string) { router.push(path) }

// ═══ 标签定义 ═══
const tabs = [
  { key: 'image', label: '图片生成' },
  { key: 'video', label: '视频生成' },
  { key: 'batch', label: '批量处理' },
  { key: 'edit', label: '图片编辑' },
  { key: 'removebg', label: '背景移除' },
  { key: 'copywrite', label: '文案生成' },
  { key: 'digital-human', label: '数字人' },
]

const activeTabLabel = computed(() => tabs.find(t => t.key === activeTab.value)?.label || '')
const activeTabPlaceholder = computed(() => {
  const map: Record<string, string> = {
    image: '描述你想要的商品图，例如：夏季连衣裙白底图，简约高级风格...',
    video: '描述你想要的带货视频，例如：护肤品展示视频，15秒口播...',
    batch: '批量处理模式，上传多张图片统一操作...',
    edit: '描述要编辑的图片效果，例如：调亮肤色、去除褶皱...',
    removebg: '上传图片，AI 自动识别主体并移除背景...',
    copywrite: '描述你的文案需求，例如：618 大促女装促销标题...',
    'digital-human': '描述数字人需求，例如：女装带货数字人，甜美风格...',
  }
  return map[activeTab.value] || '描述你的创作需求...'
})
const activeTabHint = computed(() => {
  const map: Record<string, string> = {
    image: '支持文字描述生成 / 参考图生成 / 模板生成',
    video: '支持图片转视频 / 文字转视频 / 数字人口播',
    batch: '支持批量抠图 / 批量白底 / 批量尺寸调整',
    edit: '支持精修 / 换色 / 去皱 / 风格迁移 / 文字特效',
    removebg: '3秒智能抠图，支持手动微调边缘',
    copywrite: '支持电商标题 / 详情文案 / 口播脚本 / 营销文案',
    'digital-human': '支持带货视频 / 虚拟直播 / 形象定制 / AI 主播',
  }
  return map[activeTab.value] || ''
})

// ═══ 各标签页下的卡片数据 ═══
const cardData: Record<string, { path: string; icon: string; name: string; desc: string }[]> = {
  image: [
    { path:'/work/main-image',  icon:'🖼', name:'AI 商品图',   desc:'各平台商品主图一键生成' },
    { path:'/work/scene',       icon:'🏞', name:'场景图生成',  desc:'商品融入生活场景展示' },
    { path:'/work/poster',      icon:'📰', name:'海报生成',    desc:'营销海报/活动海报/首发海报' },
    { path:'/work/white-bg',    icon:'⬜', name:'白底图生成',  desc:'符合各平台规范的白底图' },
    { path:'/work/model-generate', icon:'🧍', name:'AI 模特',  desc:'AI 生成虚拟模特穿衣展示' },
    { path:'/work/digital-human', icon:'🤖', name:'数字人带货', desc:'数字人24小时自动带货视频' },
    { path:'/work/style-transfer', icon:'🖌', name:'风格迁移', desc:'实拍图变油画/水彩/3D风格' },
    { path:'/work/text-effect', icon:'🔤', name:'文字特效',    desc:'立体/金属/霓虹等标题特效' },
  ],
  video: [
    { path:'/work/video',         icon:'🎥', name:'AI 短视频',   desc:'商品图一键生成带货短视频' },
    { path:'/work/video-edit',    icon:'✂', name:'视频编辑',    desc:'在线剪辑/加字幕/配乐/调色' },
    { path:'/work/video-translate', icon:'🌐', name:'视频翻译', desc:'语音/字幕/面容三合一翻译' },
    { path:'/work/script-gen',    icon:'📝', name:'短视频脚本', desc:'带货视频口播脚本自动生成' },
    { path:'/work/shot-plan',     icon:'📐', name:'分镜计划',   desc:'视频分镜/镜头顺序/时长规划' },
    { path:'/work/storyboard',    icon:'🎞', name:'故事板',     desc:'视频创意可视化故事板预览' },
  ],
  batch: [
    { path:'/work/batch',         icon:'📦', name:'批量处理',    desc:'50张图统一抠图+白底+尺寸' },
    { path:'/work/publish',       icon:'📤', name:'一键发布',    desc:'多平台一键分发已生成素材' },
    { path:'/work/output',        icon:'📁', name:'导出设置',    desc:'统一导出格式/尺寸/命名规则' },
    { path:'/work/usage',         icon:'📊', name:'用量统计',    desc:'每日生成量/额度消耗可视化' },
  ],
  edit: [
    { path:'/work/retouch',       icon:'✨', name:'AI 精修',     desc:'调色/锐化/光影质感优化' },
    { path:'/work/color-swap',    icon:'🎯', name:'商品换色',    desc:'同一款式展示多种颜色' },
    { path:'/work/wrinkle-remove', icon:'🧹', name:'去皱美颜',  desc:'服装褶皱自动去平整' },
    { path:'/work/ghost-mannequin', icon:'👤', name:'幽灵模特', desc:'隐形模特展示上身效果' },
    { path:'/work/outpaint',      icon:'↔', name:'智能外扩',    desc:'画面边缘智能扩展补全' },
    { path:'/work/translate-image', icon:'🌐', name:'图片翻译', desc:'图片上文字一键翻译' },
  ],
  removebg: [
    { path:'/work/remove-bg',     icon:'✂', name:'智能去背景',  desc:'AI 3秒精准识别主体去背景' },
    { path:'/work/white-bg',      icon:'⬜', name:'白底图生成',  desc:'去背景后一键输出白底图' },
    { path:'/work/virtual-tryon', icon:'👗', name:'虚拟试穿',    desc:'买家在线看衣服上身效果' },
    { path:'/work/product-render', icon:'🛒', name:'产品渲染',  desc:'3D展示商品旋转/细节' },
  ],
    copywrite: [
      { path:'/work/title-gen',     icon:'📋', name:'电商标题',   desc:'SEO优化标题/卖点标题批量生成' },
      { path:'/work/detail-copy',   icon:'📝', name:'详情文案',   desc:'商品详情页长文案智能撰写' },
      { path:'/work/script-gen',    icon:'🎙', name:'口播脚本',   desc:'带货短视频口播脚本自动生成' },
      { path:'/work/campaign-copy', icon:'📢', name:'营销文案',   desc:'大促/活动/促销文案生成' },
      { path:'/work/email-copy',    icon:'📧', name:'邮件文案',   desc:'EDM营销邮件/短信文案' },
      { path:'/work/social-copy',   icon:'📱', name:'社媒文案',   desc:'小红书/抖音/TikTok文案' },
    ],
    'digital-human': [
      { path:'/work/digital-human', icon:'🤖', name:'数字人带货', desc:'数字人24小时自动带货视频' },
      { path:'/work/digital-live',  icon:'📡', name:'数字人直播', desc:'虚拟直播间自动讲解商品' },
      { path:'/work/avatar-custom', icon:'🧬', name:'形象定制',   desc:'自定义数字人外观/声音/动作' },
      { path:'/work/ai-host',       icon:'🎤', name:'AI 主播',    desc:'智能语音播报商品卖点' },
      { path:'/work/virtual-model', icon:'👤', name:'虚拟模特',   desc:'AI生成虚拟模特穿衣展示' },
    ],
}

const activeCards = computed(() => cardData[activeTab.value] || cardData.image)

async function handleSubmit() {
  if (!prompt.value.trim()) return
  const tab = activeTab.value
  // 根据标签跳转到对应创作页面，并携带 prompt 参数
  const routes: Record<string, string> = {
    image: '/work/image',
    video: '/work/video',
    batch: '/work/batch',
    edit: '/work/image',
    removebg: '/work/remove-bg',
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
  color: var(--tx2, #6b6b70); cursor: pointer; transition: all 0.15s;
}
.wc-tab:hover { background: #fff; color: var(--tx, #171717); }
.wc-tab.sel { background: var(--tx, #171717); color: #fff; }

/* ═══ Input ═══ */
.wc-input { background: #fff; border-radius: 14px; padding: 18px; border: 1px solid var(--brd, #ebebea); box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 28px; }
.wc-textarea {
  width: 100%; border: none; resize: none; font-size: 14px; line-height: 1.6; color: var(--tx, #171717);
  font-family: inherit; outline: none; background: none;
}
.wc-textarea::placeholder { color: var(--tx3, #9d9da3); }
.wc-input-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.wc-hint { font-size: 11px; color: var(--tx3, #9d9da3); }
.wc-submit {
  padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none;
  background: var(--tx, #171717); color: #fff; cursor: pointer; transition: all 0.15s;
}
.wc-submit:hover { opacity: 0.85; transform: scale(1.02); }
.wc-submit:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

/* ═══ Grid ═══ */
.wc-section { }
.wc-sec-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.wc-sec-title { font-size: 14px; font-weight: 600; color: var(--tx, #171717); }
.wc-sec-more { font-size: 12px; color: var(--tx3, #9d9da3); background: none; border: none; cursor: pointer; }
.wc-sec-more:hover { color: var(--tx, #171717); }
.wc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.wc-card {
  background: #fff; border-radius: 11px; padding: 18px 16px; border: 1px solid var(--brd, #ebebea);
  cursor: pointer; transition: all 0.2s;
}
.wc-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); border-color: #d4d4d4; }
.wc-card-icon { font-size: 24px; margin-bottom: 8px; }
.wc-card-title { font-size: 13px; font-weight: 600; color: var(--tx, #171717); margin-bottom: 4px; }
.wc-card-desc { font-size: 12px; color: var(--tx3, #9d9da3); line-height: 1.4; }

@media (max-width: 1000px) { .wc-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 700px) { .wc-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .wc-grid { grid-template-columns: 1fr; } }
</style>
