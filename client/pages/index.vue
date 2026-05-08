<template>
  <div class="landing">
    <!-- ========== NAVIGATION ========== -->
    <header class="nav" :class="{ scrolled: scrolled }">
      <div class="nav-inner">
        <div class="nav-logo">
          <span class="logo-icon">◆</span>
          <span class="logo-text">{{ siteName }}</span>
        </div>
        <nav class="nav-links">
          <a href="#features" @click.prevent="scrollTo('features')">{{ $t('landing.nav_features') }}</a>
          <a href="#how" @click.prevent="scrollTo('how')">{{ $t('landing.nav_how') }}</a>
          <a href="#pricing" @click.prevent="scrollTo('pricing')">{{ $t('landing.nav_pricing') }}</a>
          <a href="#faq" @click.prevent="scrollTo('faq')">{{ $t('landing.nav_faq') }}</a>
        </nav>
        <div class="nav-actions">
          <template v-if="user">
            <NuxtLink to="/workspace" class="btn-nav-solid">{{ $t('nav.workspace') }}</NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="btn-nav-outline">{{ $t('nav.login') }}</NuxtLink>
            <NuxtLink to="/register" class="btn-nav-solid">{{ $t('nav.register') }}</NuxtLink>
          </template>
          <button class="hamburger" @click="mobileOpen = !mobileOpen" :aria-label="mobileOpen ? '关闭菜单' : '打开菜单'">
            <span class="ham-line" :class="{ open: mobileOpen }" />
            <span class="ham-line" :class="{ open: mobileOpen }" />
            <span class="ham-line" :class="{ open: mobileOpen }" />
          </button>
        </div>
      </div>
      <!-- Mobile drawer -->
      <transition name="slide-down">
        <div v-if="mobileOpen" class="mobile-drawer" @click="mobileOpen = false">
          <a href="#features" @click.prevent="scrollTo('features'); mobileOpen = false">{{ $t('landing.nav_features') }}</a>
          <a href="#how" @click.prevent="scrollTo('how'); mobileOpen = false">{{ $t('landing.nav_how') }}</a>
          <a href="#pricing" @click.prevent="scrollTo('pricing'); mobileOpen = false">{{ $t('landing.nav_pricing') }}</a>
          <a href="#faq" @click.prevent="scrollTo('faq'); mobileOpen = false">{{ $t('landing.nav_faq') }}</a>
          <template v-if="user">
            <NuxtLink to="/workspace" class="mobile-cta" @click="mobileOpen = false">{{ $t('nav.workspace') }}</NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/login" @click="mobileOpen = false">{{ $t('nav.login') }}</NuxtLink>
            <NuxtLink to="/register" class="mobile-cta" @click="mobileOpen = false">{{ $t('nav.register') }}</NuxtLink>
          </template>
        </div>
      </transition>
    </header>

    <!-- ========== HERO ========== -->
    <section class="hero">
      <div class="hero-particles" />
      <div class="hero-inner">
        <div class="hero-badge"><span class="pulse-dot" />{{ $t('landing.hero_sub') }}</div>
        <h1 class="hero-title">{{ $t('landing.hero_title') }}<br /><span class="gradient-text">{{ heroTitle }}</span></h1>
        <p class="hero-desc">
          {{ heroSubtitle }}
        </p>
        <div class="hero-btns">
          <template v-if="user">
            <NuxtLink to="/workspace" class="btn-hero">{{ $t('landing.hero_cta') }}</NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/register" class="btn-hero">{{ heroCta }} →</NuxtLink>
          </template>
          <NuxtLink to="/work/main-image" class="btn-hero-outline">
            <span class="play-icon">▶</span> {{ $t('landing.hero_demo') }}
          </NuxtLink>
        </div>
        <div class="hero-metrics">
          <div class="metric"><strong>200万+</strong><span>{{ $t('landing.hero_metrics.images') }}</span></div>
          <div class="metric-divider" />
          <div class="metric"><strong>50万+</strong><span>{{ $t('landing.hero_metrics.merchants') }}</span></div>
          <div class="metric-divider" />
          <div class="metric"><strong>98%</strong><span>{{ $t('landing.hero_metrics.satisfaction') }}</span></div>
        </div>
      </div>
      <!-- Hero Visual -->
      <div class="hero-mockup">
        <div class="mockup-frame">
          <div class="mockup-dots"><span /><span /><span /></div>
          <div class="mockup-body">
            <div class="mockup-sidebar">
              <div class="ms-item active" /><div class="ms-item" /><div class="ms-item" /><div class="ms-item" /><div class="ms-item" />
            </div>
            <div class="mockup-main">
              <div class="mm-tabs"><span class="active">智能主图</span><span>智能场景</span><span>智能视频</span></div>
              <div class="mm-upload"><div class="upload-icon">+</div></div>
              <div class="mm-grid">
                <div class="mm-card" v-for="i in 3" :key="i"><div class="mm-img" /><div class="mm-label">生成图 {{ i }}</div></div>
              </div>
            </div>
          </div>
        </div>
        <div class="mockup-glow" />
      </div>
    </section>

    <!-- ========== PLATFORMS ========== -->
    <section class="platforms">
      <p>{{ $t('landing.section_platforms') }}</p>
      <div class="platform-row">
        <span v-for="p in platforms" :key="p" class="plat-badge">{{ p }}</span>
      </div>
    </section>

    <!-- ========== FEATURES ========== -->
    <section id="features" class="features">
      <div class="section-head">
        <span class="section-tag">{{ $t('landing.section_features') }}</span>
        <h2>{{ $t('landing.section_features_title') }}</h2>
        <p>{{ $t('landing.section_features_desc') }}</p>
      </div>
      <div class="feature-tabs">
        <button v-for="tab in tabs" :key="tab.key" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
          <span class="tab-icon">{{ tab.icon }}</span>{{ tab.label }}
        </button>
      </div>
      <div class="card-grid">
        <div v-for="item in filteredCards" :key="item.id" class="tool-card" @click="$router.push(item.route)">
          <div class="card-top">
            <div class="card-icon" :style="{ background: item.color }">{{ item.icon }}</div>
            <span v-if="item.ai" class="ai-tag">AI</span>
          </div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
          <div class="card-tags"><span v-for="t in item.tags" :key="t">{{ t }}</span></div>
        </div>
      </div>
    </section>

    <!-- ========== HOW IT WORKS ========== -->
    <section id="how" class="how">
      <div class="section-head">
        <span class="section-tag">{{ $t('landing.section_how') }}</span>
        <h2>{{ $t('landing.section_how_title') }}</h2>
        <p>无需任何设计经验，AI 全自动完成</p>
      </div>
      <div class="steps-row">
        <div class="step-card" v-for="(s, i) in steps" :key="i">
          <div class="step-num">{{ i + 1 }}</div>
          <div class="step-icon">{{ s.icon }}</div>
          <h3>{{ s.title }}</h3>
          <p>{{ s.desc }}</p>
        </div>
      </div>
    </section>

    <!-- ========== USE CASES ========== -->
    <section class="cases">
      <div class="section-head">
        <span class="section-tag">用户故事</span>
        <h2>谁在用 Movio AI？</h2>
      </div>
      <div class="cases-grid">
        <div class="case-card" v-for="c in useCases" :key="c.title">
          <div class="case-avatar">{{ c.avatar }}</div>
          <h3>{{ c.title }}</h3>
          <p class="case-role">{{ c.desc }}</p>
          <ul><li v-for="pt in c.points" :key="pt">{{ pt }}</li></ul>
        </div>
      </div>
    </section>

    <!-- ========== PRICING ========== -->
    <section id="pricing" class="pricing">
      <div class="section-head">
        <span class="section-tag">{{ $t('landing.section_pricing') }}</span>
        <h2>{{ $t('landing.section_pricing_title') }}</h2>
        <p>新用户注册即送体验积分，免费试用全部功能</p>
      </div>
      <div class="pricing-grid">
        <div class="plan-card" v-for="plan in displayPlans" :key="plan.name" :class="{ featured: plan.featured }">
          <div v-if="plan.featured" class="plan-badge">最受欢迎</div>
          <div class="plan-icon">{{ plan.icon }}</div>
          <h3>{{ plan.name }}</h3>
          <div class="plan-price">
            <span class="currency">¥</span><span class="amount">{{ plan.price }}</span><span class="period">/月</span>
          </div>
          <ul class="plan-features">
            <li v-for="f in plan.features" :key="f">{{ f }}</li>
          </ul>
          <button class="plan-btn" :class="{ primary: plan.featured }">{{ plan.featured ? '立即开通' : '开始使用' }}</button>
        </div>
      </div>
    </section>

    <!-- ========== FAQ ========== -->
    <section id="faq" class="faq">
      <div class="section-head">
        <span class="section-tag">{{ $t('landing.section_faq') }}</span>
        <h2>{{ $t('landing.section_faq_title') }}</h2>
      </div>
      <div class="faq-list">
        <div v-for="(q, i) in faqs" :key="i" class="faq-item" :class="{ open: faqOpen === i }" @click="faqOpen = faqOpen === i ? -1 : i">
          <div class="faq-q"><span>{{ q.q }}</span><span class="faq-arrow">{{ faqOpen === i ? '−' : '+' }}</span></div>
          <div class="faq-a"><p>{{ q.a }}</p></div>
        </div>
      </div>
    </section>

    <!-- ========== CTA ========== -->
    <section class="cta">
      <div class="cta-card">
        <div class="cta-glow" />
        <h2>准备好让 AI 帮你作图了吗？</h2>
        <p>注册即送 200 体验积分，免费生成你的第一张商品图</p>
        <div class="cta-btns">
          <NuxtLink to="/register" class="btn-hero">免费注册 →</NuxtLink>
          <NuxtLink to="/help" class="cta-link">了解更多</NuxtLink>
        </div>
      </div>
    </section>

    <!-- ========== FOOTER ========== -->
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="footer-logo">◆ {{ siteName }}</span>
          <p>AI 驱动的电商视觉创作平台</p>
        </div>
        <div class="footer-links">
          <div class="footer-col">
            <h4>产品</h4>
            <a href="#features">功能</a><a href="#pricing">定价</a><a href="#how">使用流程</a>
          </div>
          <div class="footer-col">
            <h4>支持</h4>
            <a href="#faq">常见问题</a><a href="/help">帮助中心</a><a href="/help">联系我们</a>
          </div>
          <div class="footer-col">
            <h4>法律</h4>
            <a href="#">隐私政策</a><a href="#">服务条款</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>{{ footerText }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'landing' });

useHead({
  htmlAttrs: { lang: 'zh-CN' },
  title: 'Movio AI — AI电商视觉创作平台',
  meta: [
    { name: 'description', content: 'Movio AI — 电商图片视频全功能一体化平台，支持13个电商平台一键适配，从主图/场景/详情页到短视频/批量生成，AI赋能电商设计' },
    { name: 'keywords', content: 'AI电商图,电商主图制作,AI场景图,详情页生成,电商视频制作,AI抠图,商品图批量处理,淘宝主图,拼多多主图,抖音商品图,小红书封面' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { property: 'og:title', content: 'Movio AI — 图片+视频全功能一体化' },
    { property: 'og:description', content: '覆盖13个电商平台，从图片到视频一站式AI创作' },
    { property: 'og:type', content: 'website' },
  ],
  link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
});
const scrolled = ref(false);
const mobileOpen = ref(false);
const activeTab = ref('all');
const user = ref<any>(null);

async function checkAuth() {
  try { const res: any = await $fetch('/api/user/profile'); user.value = res.data; } catch { user.value = null; }
}

// Fetch site config from admin-controlled backend
const { data: siteConfig } = await useAsyncData('site-config-home', () =>
  $fetch<any>('/api/site-config/public').catch(() => ({}))
);

const siteName = computed(() => siteConfig.value?.site_name || 'Movio AI');
const heroTitle = computed(() => siteConfig.value?.hero_title || '让你的产品图秒变爆款视觉');
const heroSubtitle = computed(() => siteConfig.value?.hero_subtitle || '上传产品照片，AI 自动生成主图、场景图、详情页、带货视频。无需设计师，一个人就是一支视觉团队。');
const heroCta = computed(() => siteConfig.value?.hero_cta || '免费开始使用');
const footerText = computed(() => siteConfig.value?.footer_text || '© 2026 Movio AI. All rights reserved.');
const apiFeatures = computed(() => {
  if (Array.isArray(siteConfig.value?.features) && siteConfig.value.features.length) return siteConfig.value.features;
  return null;
});
const apiPricing = computed(() => {
  if (Array.isArray(siteConfig.value?.pricing) && siteConfig.value.pricing.length) return siteConfig.value.pricing;
  return null;
});

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const faqOpen = ref(-1);

onMounted(() => {
  window.addEventListener('scroll', () => { scrolled.value = window.scrollY > 50; });
  checkAuth();
});

const tabs = [
  { key: 'all', label: '全部', icon: '✦' },
  { key: 'image', label: '图片工具', icon: '▦' },
  { key: 'video', label: '视频工具', icon: '▶' },
  { key: 'ai', label: 'AI 功能', icon: '◆' },
];

const cards = [
  { id: 'main', icon: '▣', title: '智能做主图', desc: 'AI 自动抠图→白底→精修→裁切→品牌水印，一键生成3张风格主图', tags: ['爆款商品图,', '13平台适配'], color: '#EDE9FE', ai: true, route: '/work/main-image', category: 'image' },
  { id: 'scene', icon: '◈', title: '智能做场景', desc: '产品图+AI场景库→自动光影融合→出5张场景图，支持自定义背景', tags: ['场景融合,', '光影匹配'], color: '#DBEAFE', ai: true, route: '/work/scene', category: 'image' },
  { id: 'detail', icon: '⊞', title: '智能做详情', desc: '产品图→AI自动生成文案+图文排版→完整详情页，多品类适配', tags: ['AI文案,', '自动排版'], color: '#D1FAE5', ai: true, route: '/work/detail-h5', category: 'image' },
  { id: 'video', icon: '▶', title: '智能做视频', desc: '图片/多图→AI生成带货视频→自动字幕+BGM→1080×1920竖屏输出', tags: ['AI运镜,', '自动字幕'], color: '#FEF3C7', ai: true, route: '/work/video', category: 'video' },
  { id: 'batch', icon: '⊡', title: '批量处理', desc: '文件夹拖入→选操作→后台排队→完成通知→ZIP下载，支持夜间托管', tags: ['批量队列,', '夜间折扣'], color: '#F3E8FF', ai: false, route: '/work/batch', category: 'image' },
  { id: 'tryon', icon: '◇', title: '虚拟模特', desc: '服装平铺图→真人模特上身效果，多肤色/体型/风格可选', tags: ['AI试穿,', '多肤色'], color: '#ECFEFF', ai: true, route: '/work/virtual-tryon', category: 'image' },
  { id: 'action', icon: '◉', title: '动作迁移', desc: '人物图+参考动作视频→AI精准迁移动作姿态，生成流畅展示视频', tags: ['动作捕捉,', '精准迁移'], color: '#FCE7F3', ai: true, route: '/work/action-transfer', category: 'video' },
  { id: 'color', icon: '◐', title: '一键换色', desc: '服装鞋包颜色变换，保留褶皱纹理质感，支持批量换色', tags: ['多色生成,', '纹理保留'], color: '#FFF7ED', ai: true, route: '/work/color-swap', category: 'image' },
  { id: 'style', icon: '◧', title: '风格转化', desc: '6大风格一键转换：复古/国潮/插画/水彩/赛博/极简，保留商品特征', tags: ['6大风格,', '创意设计'], color: '#F0FDF4', ai: true, route: '/work/style-transfer', category: 'image' },
  { id: 'digital', icon: '◓', title: '口播数字人', desc: '输入文案→选数字人形象+语音→AI生成带货口播视频', tags: ['数字人,', 'TTS语音'], color: '#FFFBEB', ai: true, route: '/work/digital-human', category: 'video' },
  { id: 'script', icon: '▤', title: '带货脚本', desc: '产品卖点→AI生成短视频口播/直播话术/种草文案，支持9语种+3脚本类型', tags: ['9语种,', '口播+话术'], color: '#FDF2F8', ai: true, route: '/work/script-gen', category: 'ai' },
  { id: 'viral', icon: '◆', title: '爆款复刻', desc: '对标爆款视频→AI分析节奏/色调/转场→用你的产品重新生成相似风格', tags: ['爆款分析,', '风格复刻'], color: '#FEF2F2', ai: true, route: '/work/viral-clone', category: 'video' },
  { id: 'remove-bg', icon: '◯', title: '智能抠图', desc: 'AI发丝级抠图，毛发/透明体/复杂边缘精准分离，支持单品+批量处理', tags: ['发丝级,', '批量抠图'], color: '#E8F5E9', ai: true, route: '/work/remove-bg', category: 'image' },
  { id: 'white-bg', icon: '▭', title: '白底图生成', desc: '抠图后智能生成纯白/场景底图，自动光影校正+阴影保留，平台直出', tags: ['白底/透明,', '光影校正'], color: '#F5F5F5', ai: true, route: '/work/white-bg', category: 'image' },
  { id: 'retouch', icon: '✦', title: '图片精修', desc: 'AI自动祛皱/去污/补光/锐化，保留材质纹理，批量提升产品图质感', tags: ['祛皱补光,', '纹理保留'], color: '#FFF8E1', ai: true, route: '/work/retouch', category: 'image' },
  { id: 'platform-detail', icon: '▥', title: '平台详情页模板', desc: '13大电商平台详情页模板库，选平台→选模板→上传素材→一键生成适配尺寸', tags: ['13平台,', '尺寸适配'], color: '#EFF6FF', ai: true, route: '/work/platform-detail', category: 'image' },
  { id: 'compliance', icon: '◬', title: '跨境合规检查', desc: '上传图片+文案→自动检测亚马逊/Temu/TikTok/Shein合规风险，覆盖欧美日市场', tags: ['合规检测,', '多市场'], color: '#FFF1F2', ai: true, route: '/work/compliance-check', category: 'ai' },
  { id: 'ghost-mannequin', icon: '▯', title: '幽灵模特', desc: '服装平铺/挂拍→AI自动穿到隐形模特身上，生成3D立体效果展示图', tags: ['3D立体,', '隐形模特'], color: '#F0F9FF', ai: true, route: '/work/ghost-mannequin', category: 'image' },
  { id: 'outpaint', icon: '▩', title: '智能扩图', desc: 'AI扩展图片边缘自动补全构图，适配各平台尺寸比例，无缝融合不留痕迹', tags: ['构图补全,', '比例适配'], color: '#F5F3FF', ai: true, route: '/work/outpainting', category: 'image' },
  { id: 'image-translate', icon: '🌐', title: '图片翻译', desc: '商品图文字智能识别→翻译为9语种→原位替换，跨境卖家出海必备', tags: ['OCR识别,', '9语种翻译'], color: '#ECFDF5', ai: true, route: '/work/image-translate', category: 'image' },
  { id: 'video-edit', icon: '▸', title: '视频编辑', desc: 'AI智能裁剪/变速/转场/调色，自动生成多尺寸多时长版本供投放', tags: ['智能剪辑,', '多尺寸输出'], color: '#FFF7ED', ai: true, route: '/work/video-edit', category: 'video' },
  { id: 'voice-gen', icon: '♫', title: 'AI语音生成', desc: '输入文案→选主播音色→生成自然流畅带货配音，支持9语种50+音色', tags: ['TTS合成,', '50+音色'], color: '#FDF2F8', ai: true, route: '/work/voice-gen', category: 'ai' },
  { id: 'storyboard', icon: '⊟', title: '智能分镜', desc: '文案脚本→AI自动拆解为分镜画面+配音+字幕，一键生成完整短视频', tags: ['脚本拆解,', '自动分镜'], color: '#FFF1F2', ai: true, route: '/work/storyboard', category: 'video' },
];

const filteredCards = computed(() =>
  activeTab.value === 'all' ? cards : cards.filter(c => c.category === activeTab.value)
);

const platforms = ['淘宝', '拼多多', '抖音', '小红书', '视频号', '亚马逊', 'Temu', 'Shein', 'TikTok Shop', '美客多', 'Shopee', 'Lazada'];

const steps = [
  { icon: '📤', title: '上传产品图', desc: '拖入产品照片，支持 JPG/PNG/WebP 格式' },
  { icon: '🎯', title: '选择功能', desc: '做主图、场景、视频……一键选择需要的能力' },
  { icon: '✨', title: 'AI 自动生成', desc: '5秒出图，批量处理，自动适配各平台尺寸' },
];

const useCases = [
  { avatar: '👤', title: '个人卖家', desc: '一个人就是一支团队', points: ['手机拍照即可生成专业主图', '零设计基础出爆款详情页', '每天省下 3 小时作图时间'] },
  { avatar: '🏪', title: '中小商家', desc: '用 AI 代替设计团队', points: ['批量生成全店商品图', '统一品牌视觉风格', '降低 80% 设计成本'] },
  { avatar: '🏢', title: '品牌商家', desc: '规模化视觉内容生产', points: ['API 接口批量对接', '多店铺多平台统一管理', '品牌视觉规范自动套用'] },
];

const plans = [
  { icon: '🌱', name: '免费版', price: '0', features: ['每月 20 张图片生成', '3 个视频/月', '基础模板', '720p 输出'], featured: false },
  { icon: '⚡', name: '专业版', price: '99', features: ['每月 500 张图片生成', '50 个视频/月', '全部模板+高级风格', '1080p 输出', '批量处理', 'API 接入'], featured: true },
  { icon: '🏭', name: '企业版', price: '299', features: ['无限图片生成', '无限视频生成', '专属风格定制', '4K 输出', '私有化部署', '专属客服'], featured: false },
];

const displayPlans = computed(() => apiPricing.value || plans);

const faqs = [
  { q: '需要安装软件吗？', a: '不需要。纯网页版，浏览器打开即可使用，支持 Chrome / Safari / Edge。' },
  { q: '生成的图片可以商用吗？', a: '完全可以。所有 AI 生成的图片版权归你所有，可放心用于电商平台。' },
  { q: '支持哪些电商平台尺寸？', a: '覆盖淘宝、拼多多、抖音、小红书、亚马逊、Temu、Shein 等 13 个主流平台的标准尺寸，也支持自定义尺寸。' },
  { q: '不满意可以重新生成吗？', a: '可以。每次生成结果不满意可以免费重新生成，直到满意为止。' },
  { q: '如何批量处理？', a: '专业版及以上支持批量处理，拖入文件夹即可后台自动排队处理，支持夜间托管（6折优惠）。' },
];
</script>

<style scoped>
.landing { background: var(--bg-page); color: var(--text-primary); overflow-x: hidden; }

/* ============ NAV ============ */
.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  padding: 0 clamp(12px, 3vw, 24px); height: 64px;
  display: flex; align-items: center;
  background: transparent; transition: all var(--transition-slow);
}
.nav.scrolled { background: var(--bg-card); border-bottom: 1px solid var(--border-light); backdrop-filter: blur(12px); }
.nav-inner { max-width: 1200px; margin: 0 auto; width: 100%; display: flex; align-items: center; gap: clamp(16px, 3vw, 32px); }
.nav-logo { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: clamp(15px, 2vw, 18px); color: var(--text-primary); flex-shrink: 0; }
.logo-icon { color: var(--brand); font-size: 20px; }
.nav-links { display: flex; gap: clamp(12px, 2vw, 28px); flex-shrink: 0; }
.nav-links a { font-size: 14px; color: var(--text-secondary); text-decoration: none; transition: color var(--transition-fast); white-space: nowrap; }
.nav-links a:hover { color: var(--brand); }
.nav-actions { margin-left: auto; display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
.btn-nav-outline {
  padding: 7px clamp(14px, 2vw, 20px); border-radius: var(--radius-md); font-size: 13px; font-weight: 500;
  border: 1px solid var(--border-light); color: var(--text-primary); text-decoration: none;
  transition: all var(--transition-fast); white-space: nowrap;
}
.btn-nav-outline:hover { border-color: var(--brand); color: var(--brand); }
.btn-nav-solid {
  padding: 7px clamp(14px, 2vw, 20px); border-radius: var(--radius-md); font-size: 13px; font-weight: 600;
  background: var(--brand-gradient); color: #fff; text-decoration: none; white-space: nowrap;
  transition: all var(--transition-fast);
}
.btn-nav-solid:hover { transform: translateY(-1px); box-shadow: 0 4px 12px var(--brand-alpha-30); }

/* Hamburger */
.hamburger {
  display: none; flex-direction: column; justify-content: center; gap: 5px;
  width: 38px; height: 38px; padding: 8px 6px;
  border: 1px solid var(--border-light); background: transparent; cursor: pointer;
  border-radius: 8px; transition: all var(--transition-fast);
}
.hamburger:hover { border-color: var(--brand); background: var(--bg-hover); }
.ham-line { display: block; width: 100%; height: 2px; background: var(--text-primary); border-radius: 2px; transition: all 0.25s; transform-origin: center; }
.ham-line.open:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.ham-line.open:nth-child(2) { opacity: 0; }
.ham-line.open:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

/* Mobile drawer */
.mobile-drawer {
  display: none; position: absolute; top: 100%; left: 0; right: 0;
  background: var(--bg-card); border-bottom: 1px solid var(--border-light);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12); padding: 8px 16px 20px;
  flex-direction: column; gap: 2px;
  animation: slide-down-enter 0.25s ease-out;
}
.mobile-drawer a { display: block; padding: 12px 16px; font-size: 14px; color: var(--text-primary); text-decoration: none; border-radius: 10px; transition: all 0.15s; font-weight: 500; }
.mobile-drawer a:hover { background: var(--bg-hover); color: var(--brand); }
.mobile-drawer .mobile-cta { margin-top: 8px; background: var(--brand-gradient); color: #fff !important; text-align: center; font-weight: 600; border-radius: 12px; }

/* Nav responsive breakpoints */
@media (max-width: 768px) {
  .nav-links { display: none; }
  .btn-nav-outline { display: none; }
  .hamburger { display: flex; }
  .mobile-drawer { display: flex; }
}
@media (max-width: 420px) {
  .nav { height: 56px; }
  .btn-nav-solid { display: none; }
  .logo-icon { font-size: 16px; }
}

.slide-down-enter-active { transition: all 0.25s ease-out; }
.slide-down-leave-active { transition: all 0.2s ease-in; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-10px); }

/* ============ HERO ============ */
.hero {
  position: relative; max-width: 1200px; margin: 0 auto;
  padding: 120px 24px 80px; display: flex; align-items: center; gap: 60px;
  min-height: 100vh;
}
.hero-particles {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 60% 50% at 20% 30%, var(--brand-alpha-08) 0%, transparent 50%),
    radial-gradient(ellipse 50% 40% at 80% 60%, rgba(167,139,250,0.04) 0%, transparent 50%),
    radial-gradient(circle at 10% 80%, rgba(124,58,237,0.03) 0%, transparent 40%);
}
.hero-inner { flex: 1; max-width: 560px; position: relative; z-index: 1; }
.hero-badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 18px; border-radius: 20px; font-size: 13px; font-weight: 500;
  background: var(--brand-light); color: var(--brand); margin-bottom: 28px;
  border: 1px solid rgba(124,58,237,0.15);
}
.pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brand); animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

.hero-title {
  font-size: 54px; font-weight: 800; line-height: 1.15; color: var(--text-primary);
  margin-bottom: 24px; letter-spacing: -1.5px;
}
.gradient-text { background: linear-gradient(135deg, var(--brand) 0%, var(--brand-soft) 50%, #C084FC 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.hero-desc { font-size: 16px; color: var(--text-secondary); line-height: 1.8; margin-bottom: 36px; }
.hero-btns { display: flex; gap: 14px; align-items: center; margin-bottom: 48px; }
.btn-hero {
  padding: 13px 32px; border-radius: var(--radius-lg); font-size: 15px; font-weight: 600;
  background: var(--brand-gradient); color: #fff; text-decoration: none;
  transition: all var(--transition-fast);
  box-shadow: 0 4px 20px var(--brand-alpha-30);
}
.btn-hero:hover { transform: translateY(-2px); box-shadow: 0 8px 30px var(--brand-alpha-30); }
.btn-hero:active { transform: scale(0.98); }
.btn-hero-outline {
  display: flex; align-items: center; gap: 8px;
  padding: 13px 24px; border-radius: var(--radius-lg); font-size: 15px; font-weight: 500;
  border: 1px solid var(--border-light); color: var(--text-primary); text-decoration: none;
  transition: all var(--transition-fast); background: var(--bg-card);
}
.btn-hero-outline:hover { border-color: var(--brand); color: var(--brand); }
.play-icon { font-size: 10px; }

.hero-metrics { display: flex; align-items: center; gap: 24px; }
.metric { display: flex; flex-direction: column; gap: 2px; }
.metric strong { font-size: 22px; font-weight: 700; color: var(--text-primary); }
.metric span { font-size: 12px; color: var(--text-muted); }
.metric-divider { width: 1px; height: 30px; background: var(--border-light); }

/* Hero Mockup */
.hero-mockup { position: relative; flex-shrink: 0; width: 500px; height: 440px; display: none; }
@media (min-width: 1024px) { .hero-mockup { display: block; } }
.mockup-frame {
  position: relative; z-index: 1;
  background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: 16px; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.08);
}
.mockup-dots { display: flex; gap: 6px; padding: 14px 18px; border-bottom: 1px solid var(--border-light); }
.mockup-dots span { width: 10px; height: 10px; border-radius: 50%; background: #ddd; }
.mockup-dots span:nth-child(1) { background: #FF5F56; }
.mockup-dots span:nth-child(2) { background: #FFBD2E; }
.mockup-dots span:nth-child(3) { background: #27C93F; }
.mockup-body { display: flex; height: 360px; }
.mockup-sidebar { width: 56px; border-right: 1px solid var(--border-light); padding: 16px 12px; display: flex; flex-direction: column; gap: 10px; }
.ms-item { width: 32px; height: 32px; border-radius: var(--radius-md); background: var(--bg-hover); }
.ms-item.active { background: var(--brand-light-alt); outline: 2px solid var(--brand); outline-offset: 2px; }
.mockup-main { flex: 1; padding: 16px 20px; }
.mm-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.mm-tabs span {
  font-size: 12px; padding: 5px 14px; border-radius: var(--radius-full);
  background: var(--bg-hover); color: var(--text-muted); font-weight: 500;
}
.mm-tabs span.active { background: var(--brand-gradient); color: #fff; }
.mm-upload {
  border: 2px dashed var(--border-light); border-radius: var(--radius-lg);
  height: 100px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
}
.upload-icon { font-size: 28px; color: var(--brand-light); }
.mm-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.mm-card { border-radius: var(--radius-md); overflow: hidden; background: var(--bg-card); border: 1px solid var(--border-light); }
.mm-img { height: 70px; background: linear-gradient(135deg, var(--brand-light-alt), var(--brand-light)); }
.mm-label { font-size: 10px; padding: 6px; color: var(--text-muted); text-align: center; }
.mockup-glow {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
  width: 350px; height: 350px; border-radius: 50%;
  background: radial-gradient(circle, var(--brand-alpha-08) 0%, transparent 70%);
  pointer-events: none;
}

@media (max-width: 1023px) {
  .hero { flex-direction: column; text-align: center; padding: 100px 16px 60px; min-height: auto; }
  .hero-inner { max-width: 100%; }
  .hero-btns, .hero-metrics { justify-content: center; }
  .hero-title { font-size: 36px; }
}

/* ============ PLATFORMS ============ */
.platforms { text-align: center; padding: 0 16px 60px; max-width: 1200px; margin: 0 auto; }
.platforms p { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600; }
.platform-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.plat-badge {
  padding: 7px 20px; background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: var(--radius-full); font-size: 13px; font-weight: 500;
  color: var(--text-secondary); transition: all var(--transition-fast);
}
.plat-badge:hover { border-color: var(--brand); color: var(--brand); transform: translateY(-1px); }

/* ============ FEATURES ============ */
.features { padding: 40px 16px 80px; max-width: 1200px; margin: 0 auto; }
.section-head { text-align: center; margin-bottom: 48px; }
.section-tag {
  display: inline-block; padding: 5px 14px; border-radius: var(--radius-full);
  font-size: 12px; font-weight: 600; color: var(--brand); background: var(--brand-light);
  margin-bottom: 16px; letter-spacing: 0.5px;
}
.section-head h2 { font-size: 34px; font-weight: 800; color: var(--text-primary); margin-bottom: 10px; letter-spacing: -0.5px; }
.section-head p { font-size: 15px; color: var(--text-muted); }

.feature-tabs { display: flex; justify-content: center; gap: 8px; margin-bottom: 40px; }
.feature-tabs button {
  display: flex; align-items: center; gap: 6px; padding: 10px 24px;
  border: 1px solid var(--border-light); background: var(--bg-card);
  color: var(--text-secondary); font-size: 14px; border-radius: var(--radius-full);
  cursor: pointer; transition: all var(--transition-fast); font-weight: 500;
}
.feature-tabs button:hover { border-color: var(--brand); color: var(--brand); }
.feature-tabs button.active { background: var(--brand); color: #fff; border-color: var(--brand); font-weight: 600; }
.tab-icon { font-size: 15px; }

.card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 960px) { .card-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .card-grid { grid-template-columns: 1fr; } }

.tool-card {
  background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: var(--radius-xl); padding: 24px; cursor: pointer;
  transition: all 0.25s ease;
}
.tool-card:hover { border-color: var(--brand-soft); box-shadow: 0 8px 30px var(--brand-alpha-08); transform: translateY(-3px); }
.card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.card-icon {
  width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex;
  align-items: center; justify-content: center; font-size: 22px;
}
.ai-tag {
  font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px;
  background: linear-gradient(135deg, var(--brand-soft), #6366F1); color: #fff;
}
.tool-card h3 { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
.tool-card > p { font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.card-tags span { font-size: 11px; padding: 3px 10px; background: var(--tag-bg); border-radius: var(--radius-sm); color: var(--text-muted); }

/* ============ HOW ============ */
.how { padding: 40px 16px 80px; max-width: 1200px; margin: 0 auto; }
.steps-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
@media (max-width: 768px) { .steps-row { grid-template-columns: 1fr; max-width: 380px; margin: 0 auto; } }
.step-card {
  text-align: center; background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: var(--radius-xl); padding: 36px 24px;
  transition: all var(--transition-slow); position: relative;
}
.step-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px var(--brand-alpha-08); border-color: var(--brand-soft); }
.step-num {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--brand-gradient);
  color: var(--text-on-brand); font-size: 18px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
}
.step-icon { font-size: 38px; margin-bottom: 12px; }
.step-card h3 { font-size: 17px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.step-card p { font-size: 13px; color: var(--text-muted); line-height: 1.7; }

/* ============ CASES ============ */
.cases { padding: 40px 16px 80px; background: var(--brand-light); }
[data-theme="dark"] .cases { background: var(--brand-darkest); }
.cases-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 1200px; margin: 0 auto; }
@media (max-width: 860px) { .cases-grid { grid-template-columns: 1fr; max-width: 420px; } }
.case-card {
  background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: var(--radius-xl); padding: 32px 28px; transition: all var(--transition-slow);
}
.case-card:hover { box-shadow: 0 8px 30px var(--brand-alpha-08); border-color: var(--brand-soft); transform: translateY(-2px); }
.case-avatar { font-size: 44px; margin-bottom: 16px; }
.case-card h3 { font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.case-role { font-size: 13px; color: var(--text-muted); margin-bottom: 18px; }
.case-card ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.case-card li { font-size: 13px; color: var(--text-secondary); padding-left: 16px; position: relative; }
.case-card li::before { content: ''; position: absolute; left: 0; top: 6px; width: 6px; height: 6px; border-radius: 50%; background: var(--brand-soft); }

/* ============ PRICING ============ */
.pricing { padding: 60px 16px 80px; max-width: 1200px; margin: 0 auto; }
.pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; align-items: start; }
@media (max-width: 900px) { .pricing-grid { grid-template-columns: 1fr; max-width: 420px; margin: 0 auto; } }
.plan-card {
  position: relative; text-align: center;
  background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: var(--radius-xl); padding: 36px 28px;
  transition: all var(--transition-slow);
}
.plan-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px var(--brand-alpha-08); }
.plan-card.featured { border-color: var(--brand-soft); box-shadow: 0 8px 40px var(--brand-alpha-12); }
.plan-badge {
  position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
  padding: 5px 18px; border-radius: var(--radius-full);
  font-size: 12px; font-weight: 600;
  background: var(--brand-gradient); color: #fff;
}
.plan-icon { font-size: 36px; margin-bottom: 12px; }
.plan-card h3 { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; }
.plan-price { margin-bottom: 24px; }
.currency { font-size: 20px; font-weight: 600; color: var(--text-secondary); }
.amount { font-size: 44px; font-weight: 800; color: var(--text-primary); }
.period { font-size: 14px; color: var(--text-muted); }
.plan-features { list-style: none; padding: 0; margin-bottom: 28px; display: flex; flex-direction: column; gap: 10px; }
.plan-features li { font-size: 13px; color: var(--text-secondary); }
.plan-btn {
  width: 100%; padding: 12px; border-radius: var(--radius-lg); font-size: 15px; font-weight: 600;
  border: 1px solid var(--border-light); background: var(--bg-card);
  color: var(--text-primary); cursor: pointer; transition: all var(--transition-fast);
}
.plan-btn:hover { border-color: var(--brand); color: var(--brand); }
.plan-btn.primary { background: var(--brand-gradient); color: #fff; border: none; box-shadow: 0 4px 16px var(--brand-alpha-25); }
.plan-btn.primary:hover { box-shadow: 0 8px 24px var(--brand-alpha-30); transform: translateY(-1px); }
.plan-btn:active { transform: scale(0.98); }

/* ============ FAQ ============ */
.faq { padding: 40px 16px 80px; max-width: 720px; margin: 0 auto; }
.faq-list { display: flex; flex-direction: column; gap: 12px; }
.faq-item {
  background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: var(--radius-lg); overflow: hidden; cursor: pointer;
  transition: all var(--transition-fast);
}
.faq-item:hover { border-color: var(--brand-soft); }
.faq-item.open { border-color: var(--brand-soft); }
.faq-q {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 22px; font-size: 15px; font-weight: 600; color: var(--text-primary);
}
.faq-arrow { font-size: 20px; color: var(--brand); transition: transform var(--transition-fast); }
.faq-a { max-height: 0; overflow: hidden; transition: max-height var(--transition-slow), padding var(--transition-slow); }
.faq-item.open .faq-a { max-height: 120px; padding: 0 22px 18px; }
.faq-a p { font-size: 14px; color: var(--text-secondary); line-height: 1.7; }

/* ============ CTA ============ */
.cta { padding: 40px 16px 80px; max-width: 1200px; margin: 0 auto; }
.cta-card {
  position: relative; overflow: hidden;
  background: var(--hero-cta-bg);
  border-radius: 24px; padding: 64px 48px; text-align: center;
}
.cta-glow {
  position: absolute; top: -60%; right: -15%; width: 450px; height: 450px;
  background: radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%);
  border-radius: 50%; pointer-events: none;
}
.cta-card h2 { font-size: 32px; font-weight: 800; color: var(--text-on-dark); margin-bottom: 12px; position: relative; z-index: 1; }
.cta-card p { font-size: 15px; color: var(--text-muted); margin-bottom: 32px; position: relative; z-index: 1; }
.cta-btns { display: flex; gap: 16px; justify-content: center; align-items: center; position: relative; z-index: 1; }
.cta-link { font-size: 15px; color: var(--text-muted); text-decoration: none; transition: color var(--transition-fast); }
.cta-link:hover { color: var(--text-on-brand); }

/* ============ FOOTER ============ */
.footer { border-top: 1px solid var(--border-light); padding: 48px 24px 32px; max-width: 1200px; margin: 0 auto; }
.footer-inner { display: flex; gap: 80px; margin-bottom: 32px; }
.footer-brand p { font-size: 13px; color: var(--text-muted); margin-top: 8px; }
.footer-logo { font-weight: 700; font-size: 16px; color: var(--text-primary); }
.footer-links { display: flex; gap: 64px; }
.footer-col h4 { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.footer-col a { display: block; font-size: 13px; color: var(--text-muted); text-decoration: none; margin-bottom: 8px; transition: color var(--transition-fast); }
.footer-col a:hover { color: var(--brand); }
.footer-bottom { padding-top: 24px; border-top: 1px solid var(--border-light); text-align: center; font-size: 12px; color: var(--text-muted); }

@media (max-width: 768px) {
  .footer-inner { flex-direction: column; gap: 32px; }
  .footer-links { gap: 32px; flex-wrap: wrap; }
}
</style>
