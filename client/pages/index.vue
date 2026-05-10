<template>
  <div class="lp">
    <!-- ===== NAV ===== -->
    <header class="lp-nav" :class="{ on: scrolled }">
      <div class="lp-nav-in">
        <NuxtLink to="/" class="lp-nav-brand" aria-label="Movio AI 首页">
          <span class="lp-nav-mark">M</span>
          <span class="lp-nav-name">{{ siteName }}</span>
        </NuxtLink>
        <nav class="lp-nav-lk">
          <a href="#features" @click.prevent="scrollTo('features')">{{ $t('landing.nav_features') }}</a>
          <a href="#how" @click.prevent="scrollTo('how')">{{ $t('landing.nav_how') }}</a>
          <a href="#pricing" @click.prevent="scrollTo('pricing')">{{ $t('landing.nav_pricing') }}</a>
          <a href="#faq" @click.prevent="scrollTo('faq')">{{ $t('landing.nav_faq') }}</a>
        </nav>
        <div class="lp-nav-act">
          <LangSwitcher />
          <template v-if="user">
            <NuxtLink to="/workspace" class="lp-btn-main">{{ $t('nav.workspace') }}</NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="lp-btn-ghost">{{ $t('nav.login') }}</NuxtLink>
            <NuxtLink to="/register" class="lp-btn-main">{{ $t('nav.register') }}</NuxtLink>
          </template>
          <button class="lp-ham" @click="mobileOpen = !mobileOpen" :aria-label="mobileOpen ? '关闭' : '菜单'">
            <span :class="{ on: mobileOpen }" /><span :class="{ on: mobileOpen }" /><span :class="{ on: mobileOpen }" />
          </button>
        </div>
      </div>
      <transition name="sd">
        <div v-if="mobileOpen" class="lp-mob" @click="mobileOpen = false">
          <a href="#features" @click.prevent="scrollTo('features'); mobileOpen = false">{{ $t('landing.nav_features') }}</a>
          <a href="#how" @click.prevent="scrollTo('how'); mobileOpen = false">{{ $t('landing.nav_how') }}</a>
          <a href="#pricing" @click.prevent="scrollTo('pricing'); mobileOpen = false">{{ $t('landing.nav_pricing') }}</a>
          <a href="#faq" @click.prevent="scrollTo('faq'); mobileOpen = false">{{ $t('landing.nav_faq') }}</a>
          <template v-if="user">
            <NuxtLink to="/workspace" class="lp-mob-cta" @click="mobileOpen = false">{{ $t('nav.workspace') }}</NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/login" @click="mobileOpen = false">{{ $t('nav.login') }}</NuxtLink>
            <NuxtLink to="/register" class="lp-mob-cta" @click="mobileOpen = false">{{ $t('nav.register') }}</NuxtLink>
          </template>
        </div>
      </transition>
    </header>

    <!-- ===== HERO ===== -->
    <section class="lp-hero">
      <div class="lp-hero-bg" />
      <div class="lp-hero-body">
        <div class="lp-hero-tag"><i /><span>{{ $t('landing.hero_sub') }}</span></div>
        <h1 class="lp-hero-h1">{{ $t('landing.hero_title') }}<br /><em>{{ heroTitle }}</em></h1>
        <p class="lp-hero-p">{{ heroSubtitle }}</p>
        <div class="lp-hero-btns">
          <template v-if="user">
            <NuxtLink to="/workspace" class="lp-hero-cta">{{ $t('landing.hero_cta') }}</NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/register" class="lp-hero-cta">{{ heroCta }} <span>&rarr;</span></NuxtLink>
          </template>
          <NuxtLink to="/work/main-image" class="lp-hero-demo">
            <span class="lp-hero-play">&#9654;</span> {{ $t('landing.hero_demo') }}
          </NuxtLink>
        </div>
        <div class="lp-hero-nums">
          <div><b>200万+</b><span>{{ $t('landing.hero_metrics.images') }}</span></div>
          <i />
          <div><b>50万+</b><span>{{ $t('landing.hero_metrics.merchants') }}</span></div>
          <i />
          <div><b>98%</b><span>{{ $t('landing.hero_metrics.satisfaction') }}</span></div>
        </div>
      </div>
      <!-- Desktop Mockup -->
      <div class="lp-hero-mock">
        <div class="lp-mock">
          <div class="lp-mock-bar"><span /><span /><span /></div>
          <div class="lp-mock-in">
            <div class="lp-mock-side">
              <span class="on" /><span /><span /><span /><span />
            </div>
            <div class="lp-mock-main">
              <div class="lp-mock-tabs"><span class="on">智能主图</span><span>智能场景</span><span>智能视频</span></div>
              <div class="lp-mock-up"><span>+</span></div>
              <div class="lp-mock-grid">
                <div v-for="i in 3" :key="i"><div /><span>生成图 {{ i }}</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="lp-mock-glow" />
      </div>
      <!-- Mobile Mockup -->
      <div class="lp-hero-mob">
        <div class="lp-mob-card">
          <div class="lp-mob-card-bar"><span /><span /><span /></div>
          <div class="lp-mob-card-body">
            <div class="lp-mob-card-tabs"><span class="on">智能主图</span><span>场景</span><span>视频</span></div>
            <div class="lp-mob-card-up">+ 上传图片</div>
            <div class="lp-mob-card-grid"><div v-for="i in 3" :key="i"><div /></div></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== MemFocus AI — 百万年薪秘书 ===== -->
    <section class="lp-memfocus">
      <div class="lp-sec-hd">
        <span class="lp-sec-tag">MemFocus AI</span>
        <h2>你的百万年薪私人总秘书</h2>
        <p>8 维核心能力，24×7 巅峰状态，永不离职</p>
      </div>
      <div class="lp-mf-grid">
        <div class="lp-mf-card" v-for="c in memfocusCards" :key="c.key">
          <div class="lp-mf-badge">{{ c.badge }}</div>
          <div class="lp-mf-title">{{ c.title }}</div>
          <div class="lp-mf-sub">{{ c.sub }}</div>
          <div class="lp-mf-divider" />
          <div class="lp-mf-api">{{ c.api }}</div>
          <div class="lp-mf-story">"{{ c.story }}"</div>
          <div class="lp-mf-metric"><span>{{ c.metricLabel }}</span><b>{{ c.metricValue }}</b></div>
        </div>
      </div>
      <div class="lp-mf-quote">
        <span>"</span>没有请假、不闹情绪、不跳槽——每次调用都是巅峰状态<span>"</span>
      </div>
    </section>

    <!-- ===== PLATFORMS ===== -->
    <section class="lp-plat">
      <p>{{ $t('landing.section_platforms') }}</p>
      <div class="lp-plat-row"><span v-for="p in platforms" :key="p">{{ p }}</span></div>
    </section>

    <!-- ===== FEATURES ===== -->
    <section id="features" class="lp-feat">
      <div class="lp-sec-hd">
        <span class="lp-sec-tag">{{ $t('landing.section_features') }}</span>
        <h2>{{ $t('landing.section_features_title') }}</h2>
        <p>{{ $t('landing.section_features_desc') }}</p>
      </div>
      <div class="lp-feat-tabs">
        <button v-for="tab in tabs" :key="tab.key" :class="{ on: activeTab === tab.key }" @click="activeTab = tab.key">
          {{ tab.label }}
        </button>
      </div>
      <div class="lp-feat-grid">
        <div v-for="item in filteredCards" :key="item.id" class="lp-card" @click="$router.push(item.route)">
          <div class="lp-card-top">
            <div class="lp-card-ico" :style="{ background: item.color }">{{ item.icon }}</div>
            <span v-if="item.ai" class="lp-card-ai">AI</span>
          </div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
          <div class="lp-card-tags"><span v-for="t in item.tags" :key="t">{{ t }}</span></div>
        </div>
      </div>
    </section>

    <!-- ===== HOW ===== -->
    <section id="how" class="lp-how">
      <div class="lp-sec-hd">
        <span class="lp-sec-tag">{{ $t('landing.section_how') }}</span>
        <h2>{{ $t('landing.section_how_title') }}</h2>
        <p>无需任何设计经验，AI 全自动完成</p>
      </div>
      <div class="lp-how-row">
        <div class="lp-step" v-for="(s, i) in steps" :key="i">
          <div class="lp-step-num">{{ i + 1 }}</div>
          <div class="lp-step-ico">{{ s.icon }}</div>
          <h3>{{ s.title }}</h3>
          <p>{{ s.desc }}</p>
        </div>
      </div>
    </section>

    <!-- ===== USE CASES ===== -->
    <section class="lp-cases">
      <div class="lp-sec-hd">
        <span class="lp-sec-tag">用户故事</span>
        <h2>谁在用 Movio AI？</h2>
      </div>
      <div class="lp-cases-grid">
        <div class="lp-case" v-for="c in useCases" :key="c.title">
          <div class="lp-case-av">{{ c.avatar }}</div>
          <h3>{{ c.title }}</h3>
          <p class="lp-case-role">{{ c.desc }}</p>
          <ul><li v-for="pt in c.points" :key="pt">{{ pt }}</li></ul>
        </div>
      </div>
    </section>

    <!-- ===== PRICING ===== -->
    <section id="pricing" class="lp-price">
      <div class="lp-sec-hd">
        <span class="lp-sec-tag">{{ $t('landing.section_pricing') }}</span>
        <h2>{{ $t('landing.section_pricing_title') }}</h2>
        <p>新用户注册即送体验积分，免费试用全部功能</p>
      </div>
      <div class="lp-price-grid">
        <div class="lp-plan" v-for="plan in displayPlans" :key="plan.name" :class="{ pop: plan.featured }">
          <div v-if="plan.featured" class="lp-plan-badge">最受欢迎</div>
          <div class="lp-plan-ico">{{ plan.icon }}</div>
          <h3>{{ plan.name }}</h3>
          <div class="lp-plan-pr"><b>¥{{ plan.price }}</b><span>/月</span></div>
          <ul class="lp-plan-feat"><li v-for="f in plan.features" :key="f">{{ f }}</li></ul>
          <button class="lp-plan-btn" :class="{ on: plan.featured }">{{ plan.featured ? '立即开通' : '开始使用' }}</button>
        </div>
      </div>
    </section>

    <!-- ===== FAQ ===== -->
    <section id="faq" class="lp-faq">
      <div class="lp-sec-hd">
        <span class="lp-sec-tag">{{ $t('landing.section_faq') }}</span>
        <h2>{{ $t('landing.section_faq_title') }}</h2>
      </div>
      <div class="lp-faq-list">
        <div v-for="(q, i) in faqs" :key="i" class="lp-faq-it" :class="{ on: faqOpen === i }" @click="faqOpen = faqOpen === i ? -1 : i">
          <div class="lp-faq-q"><span>{{ q.q }}</span><span class="lp-faq-arw">{{ faqOpen === i ? '−' : '+' }}</span></div>
          <div class="lp-faq-a"><p>{{ q.a }}</p></div>
        </div>
      </div>
    </section>

    <!-- ===== CTA ===== -->
    <section class="lp-cta">
      <div class="lp-cta-card">
        <div class="lp-cta-glow" />
        <h2>准备好让 AI 帮你作图了吗？</h2>
        <p>注册即送 200 体验积分，免费生成你的第一张商品图</p>
        <div class="lp-cta-btns">
          <NuxtLink to="/register" class="lp-hero-cta">免费注册 <span>&rarr;</span></NuxtLink>
          <NuxtLink to="/help" class="lp-cta-link">了解更多</NuxtLink>
        </div>
      </div>
    </section>

    <!-- ===== FOOTER ===== -->
    <footer class="lp-foot">
      <div class="lp-foot-in">
        <div class="lp-foot-brand">
          <span class="lp-foot-logo">M</span>
          <span class="lp-foot-name">{{ siteName }}</span>
          <p>AI 驱动的电商视觉创作平台</p>
        </div>
        <div class="lp-foot-lk">
          <div><h4>产品</h4><a href="#features">功能</a><a href="#pricing">定价</a><a href="#how">使用流程</a></div>
          <div><h4>支持</h4><a href="#faq">常见问题</a><NuxtLink to="/help">帮助中心</NuxtLink><NuxtLink to="/help">联系我们</NuxtLink></div>
          <div><h4>法律</h4><NuxtLink to="/legal/privacy">隐私政策</NuxtLink><NuxtLink to="/legal/terms">服务条款</NuxtLink></div>
        </div>
      </div>
      <div class="lp-foot-bot"><span>{{ footerText }}</span></div>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'landing' });

useHead({
  htmlAttrs: { lang: 'zh-CN' },
  title: 'Movio AI — 全链路运营助手',
  meta: [
    { name: 'description', content: 'Movio AI — 全链路运营助手，电商AI内容中台。上传产品照片即可生成主图、场景图、详情页、带货视频，一个人就是一支视觉团队' },
    { name: 'keywords', content: 'AI电商图,电商主图制作,AI场景图,详情页生成,电商视频制作,AI抠图,商品图批量处理,淘宝主图,拼多多主图,抖音商品图,小红书封面' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { property: 'og:title', content: 'Movio AI — 全链路运营助手' },
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
const heroTitle = computed(() => siteConfig.value?.hero_title || '让你的产品秒变爆款');
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

const handleScroll = () => { scrolled.value = window.scrollY > 50; };
onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
  checkAuth();
});
onUnmounted(() => { window.removeEventListener('scroll', handleScroll); });

const tabs = [
  { key: 'all', label: '全部', icon: '✦' },
  { key: 'image', label: '图片工具', icon: '▦' },
  { key: 'video', label: '视频工具', icon: '▶' },
  { key: 'ai', label: 'AI 功能', icon: '◆' },
];

const memfocusCards = [
  { key:'memory', badge:'记忆力', title:'过目不忘', sub:'精准回顾每个客户', api:'四层记忆 API', story:'王女士上次买了胶原蛋白果冻——问她要不要复购', metricLabel:'客户留存提升', metricValue:'+37%' },
  { key:'priority', badge:'判断力', title:'优先级分拣', sub:'退款先处理，新品排队', api:'注意力引擎 API', story:'退款投诉立刻处理，新品咨询排队稍后——优先级的艺术', metricLabel:'紧急工单响应', metricValue:'<30s' },
  { key:'context', badge:'理解力', title:'一点就通', sub:'语境感知，指代消解', api:'上下文管理 API', story:'客户说"那个红色的"——秘书知道指的是上次聊的红色连衣裙', metricLabel:'上下文窗口', metricValue:'8K tokens' },
  { key:'i18n', badge:'多语言', title:'7 国语物料', sub:'比本地团队更懂当地审美', api:'跨境本地化 API', story:'中文产品一键出 7 国物料——比本地团队更懂当地审美', metricLabel:'覆盖语种', metricValue:'7 语' },
  { key:'copy', badge:'写作力', title:'转化率导向', sub:'标题/卖点/详情/脚本', api:'内容生成 API', story:'标题/卖点/详情/直播脚本——比文案更懂转化率', metricLabel:'内容类型覆盖', metricValue:'6 类' },
  { key:'compliance', badge:'风控力', title:'五层过滤', sub:'零违规处罚', api:'安全合规 API', story:'五层敏感词过滤，零违规处罚——比合规经理更严谨', metricLabel:'过滤层数', metricValue:'5 层' },
  { key:'video', badge:'视觉力', title:'100 SKU 并行', sub:'2 小时搞定全部视频', api:'视频批量生成 API', story:'15s/30s TikTok 商品视频——100 SKU 并行 2 小时搞定', metricLabel:'并行吞吐', metricValue:'100 SKU' },
  { key:'uptime', badge:'永不离职', title:'24×7 巅峰', sub:'不请假不跳槽不闹情绪', api:'24×7 API 可用', story:'没有请假、不闹情绪、不跳槽——每次调用都是巅峰状态', metricLabel:'可用性目标', metricValue:'99.9%' },
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
/* ============ ROOT ============ */
.lp { background: #fafaf9; color: #171717; overflow-x: hidden; font-feature-settings: 'cv02','cv03','cv04','cv11'; }

/* ============ NAV ============ */
.lp-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  padding: 0 clamp(12px, 3vw, 24px); height: 56px;
  display: flex; align-items: center;
  background: transparent; transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.lp-nav.on { background: rgba(250,250,249,0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid #ebebea; }
.lp-nav-in { width: 100%; max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 40px; }
.lp-nav-brand { display: flex; align-items: center; gap: 8px; text-decoration: none; flex-shrink: 0; }
.lp-nav-mark { width: 28px; height: 28px; background: #171717; color: #fafaf9; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; letter-spacing: -0.5px; }
.lp-nav-name { font-size: 15px; font-weight: 500; color: #171717; letter-spacing: -0.02em; }
.lp-nav-lk { display: flex; gap: 32px; flex: 1; justify-content: center; }
.lp-nav-lk a { font-size: 13px; color: #6b6b70; text-decoration: none; transition: color 0.2s; letter-spacing: -0.01em; }
.lp-nav-lk a:hover { color: #171717; }
.lp-nav-act { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.lp-btn-main {
  display: inline-flex; align-items: center; padding: 8px 18px;
  background: #171717; color: #fafaf9; border: none; border-radius: 8px;
  font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none;
  transition: all 0.2s; letter-spacing: -0.01em;
}
.lp-btn-main:hover { background: #2d2d2d; transform: translateY(-1px); }
.lp-btn-ghost {
  display: inline-flex; align-items: center; padding: 8px 18px;
  background: transparent; color: #171717; border: 1px solid #ebebea; border-radius: 8px;
  font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none;
  transition: all 0.2s; letter-spacing: -0.01em;
}
.lp-btn-ghost:hover { border-color: #c5c5c2; background: rgba(0,0,0,0.02); }

.lp-ham { display: none; width: 36px; height: 36px; border: none; background: transparent; flex-direction: column; align-items: center; justify-content: center; gap: 5px; cursor: pointer; border-radius: 8px; }
.lp-ham span { display: block; width: 18px; height: 1.5px; background: #171717; border-radius: 1px; transition: all 0.25s; }
.lp-ham span.on:first-child { transform: translateY(6.5px) rotate(45deg); }
.lp-ham span.on:nth-child(2) { opacity: 0; }
.lp-ham span.on:last-child { transform: translateY(-6.5px) rotate(-45deg); }

.lp-mob { position: fixed; top: 56px; left: 0; right: 0; background: #fafaf9; border-bottom: 1px solid #ebebea; padding: 16px 20px; display: flex; flex-direction: column; gap: 2px; z-index: 99; }
.lp-mob a { display: block; padding: 12px 16px; font-size: 15px; color: #171717; text-decoration: none; border-radius: 8px; transition: background 0.15s; }
.lp-mob a:hover { background: rgba(0,0,0,0.04); }
.lp-mob-cta { display: block; margin-top: 8px; padding: 12px 16px; background: #171717; color: #fafaf9 !important; border-radius: 8px; text-align: center; font-weight: 500 !important; }

/* ============ HERO ============ */
.lp-hero { position: relative; padding: 120px clamp(16px, 4vw, 40px) 80px; display: flex; flex-direction: column; align-items: center; text-align: center; overflow: hidden; }
.lp-hero-bg { position: absolute; inset: 0; background: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,0,0,0.03), transparent 70%); pointer-events: none; }
.lp-hero-body { position: relative; z-index: 2; max-width: 720px; }
.lp-hero-tag { display: inline-flex; align-items: center; gap: 8px; padding: 5px 14px; background: rgba(0,0,0,0.04); border-radius: 999px; font-size: 12px; color: #6b6b70; margin-bottom: 24px; letter-spacing: -0.01em; }
.lp-hero-tag i { width: 6px; height: 6px; border-radius: 50%; background: #2d9b6e; }
.lp-hero-h1 { font-size: clamp(32px, 6vw, 56px); font-weight: 500; line-height: 1.12; letter-spacing: -0.04em; color: #171717; margin: 0 0 20px; }
.lp-hero-h1 em { font-style: normal; background: linear-gradient(135deg, #5b5fe3, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.lp-hero-p { font-size: 17px; line-height: 1.65; color: #6b6b70; margin: 0 0 32px; max-width: 560px; margin-left: auto; margin-right: auto; }
.lp-hero-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 40px; }
.lp-hero-cta {
  display: inline-flex; align-items: center; gap: 6px; padding: 12px 28px;
  background: #171717; color: #fafaf9; border: none; border-radius: 10px;
  font-size: 15px; font-weight: 500; cursor: pointer; text-decoration: none;
  transition: all 0.25s; letter-spacing: -0.02em;
}
.lp-hero-cta:hover { background: #2d2d2d; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
.lp-hero-cta span { transition: transform 0.2s; }
.lp-hero-cta:hover span { transform: translateX(3px); }
.lp-hero-demo {
  display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px;
  background: transparent; color: #171717; border: 1px solid #ebebea; border-radius: 10px;
  font-size: 14px; font-weight: 500; cursor: pointer; text-decoration: none;
  transition: all 0.2s;
}
.lp-hero-demo:hover { border-color: #c5c5c2; background: rgba(0,0,0,0.02); }
.lp-hero-play { font-size: 10px; }
.lp-hero-nums { display: flex; align-items: center; gap: 24px; justify-content: center; flex-wrap: wrap; }
.lp-hero-nums div { text-align: center; }
.lp-hero-nums b { display: block; font-size: 28px; font-weight: 500; letter-spacing: -0.03em; color: #171717; }
.lp-hero-nums span { font-size: 12px; color: #6b6b70; }
.lp-hero-nums i { width: 1px; height: 32px; background: #ebebea; display: block; }

/* Hero Mockup */
.lp-hero-mock { position: relative; margin-top: 48px; z-index: 1; }
.lp-hero-mob { display: none; margin-top: 40px; }
.lp-mock {
  width: clamp(320px, 70vw, 860px); background: #fff; border-radius: 12px;
  border: 1px solid #ebebea; box-shadow: 0 4px 32px rgba(0,0,0,0.06); overflow: hidden;
}
.lp-mock-bar { display: flex; gap: 8px; padding: 12px 16px; border-bottom: 1px solid #f5f5f4; }
.lp-mock-bar span { width: 10px; height: 10px; border-radius: 50%; background: #ebebea; }
.lp-mock-bar span:first-child { background: #d1d1cf; }
.lp-mock-bar span:last-child { background: #d1d1cf; }
.lp-mock-in { display: flex; height: 340px; }
.lp-mock-side { width: 48px; border-right: 1px solid #f5f5f4; display: flex; flex-direction: column; align-items: center; padding: 12px 0; gap: 10px; }
.lp-mock-side span { width: 20px; height: 20px; border-radius: 5px; background: #f5f5f4; }
.lp-mock-side span.on { background: #171717; }
.lp-mock-main { flex: 1; padding: 16px 20px; }
.lp-mock-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.lp-mock-tabs span { padding: 5px 14px; border-radius: 7px; font-size: 12px; color: #6b6b70; background: #f5f5f4; }
.lp-mock-tabs span.on { background: #171717; color: #fafaf9; }
.lp-mock-up { height: 120px; border: 1.5px dashed #ebebea; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #b0b0b5; font-size: 28px; font-weight: 300; margin-bottom: 14px; }
.lp-mock-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.lp-mock-grid div { background: #fafaf9; border-radius: 8px; height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border: 1px solid #f5f5f4; }
.lp-mock-grid div div { width: 70%; height: 40px; background: #f0efed; border: none; border-radius: 4px; }
.lp-mock-grid div span { font-size: 10px; color: #b0b0b5; }
.lp-mock-glow { position: absolute; top: -40px; left: 50%; transform: translateX(-50%); width: 600px; height: 200px; background: radial-gradient(ellipse, rgba(91,95,227,0.08), transparent 70%); pointer-events: none; z-index: -1; }

/* Mobile Mockup */
.lp-mob-card { width: 260px; background: #fff; border-radius: 16px; border: 1px solid #ebebea; box-shadow: 0 4px 24px rgba(0,0,0,0.06); overflow: hidden; margin: 0 auto; }
.lp-mob-card-bar { display: flex; gap: 6px; padding: 10px 12px; border-bottom: 1px solid #f5f5f4; }
.lp-mob-card-bar span { width: 7px; height: 7px; border-radius: 50%; background: #ebebea; }
.lp-mob-card-body { padding: 14px 12px; }
.lp-mob-card-tabs { display: flex; gap: 6px; margin-bottom: 12px; }
.lp-mob-card-tabs span { padding: 4px 10px; border-radius: 6px; font-size: 11px; color: #6b6b70; background: #f5f5f4; }
.lp-mob-card-tabs span.on { background: #171717; color: #fafaf9; }
.lp-mob-card-up { height: 56px; border: 1.5px dashed #ebebea; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #b0b0b5; font-size: 12px; margin-bottom: 10px; }
.lp-mob-card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.lp-mob-card-grid div { height: 60px; background: #fafaf9; border-radius: 6px; border: 1px solid #f5f5f4; }
.lp-mob-card-grid div div { width: 60%; height: 24px; background: #f0efed; margin: 10px auto 0; border: none; border-radius: 3px; }

/* ============ MemFocus AI ============ */
.lp-memfocus { padding: 80px clamp(16px, 4vw, 40px); background: linear-gradient(180deg, #fafaf9 0%, #f5f4f1 50%, #fafaf9 100%); border-top: 1px solid #ebebea; }
.lp-mf-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 1200px; margin: 0 auto 40px; }
.lp-mf-card {
  background: #fff; border: 1px solid #ebebea; border-radius: 14px; padding: 22px 18px 18px;
  display: flex; flex-direction: column; gap: 8px; transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); position: relative; overflow: hidden;
}
.lp-mf-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; opacity: 0; transition: opacity 0.3s; }
.lp-mf-card:nth-child(1)::before { background: linear-gradient(90deg, #6366f1, #818cf8); }
.lp-mf-card:nth-child(2)::before { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.lp-mf-card:nth-child(3)::before { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
.lp-mf-card:nth-child(4)::before { background: linear-gradient(90deg, #06b6d4, #22d3ee); }
.lp-mf-card:nth-child(5)::before { background: linear-gradient(90deg, #ec4899, #f472b6); }
.lp-mf-card:nth-child(6)::before { background: linear-gradient(90deg, #22c55e, #4ade80); }
.lp-mf-card:nth-child(7)::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.lp-mf-card:nth-child(8)::before { background: linear-gradient(90deg, #ef4444, #f87171); }
.lp-mf-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.08); border-color: #d9d9d7; }
.lp-mf-card:hover::before { opacity: 1; }
.lp-mf-badge { font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #b0b0b5; }
.lp-mf-title { font-size: 18px; font-weight: 700; color: #171717; letter-spacing: -0.02em; line-height: 1.2; }
.lp-mf-sub { font-size: 12px; color: #8e8e93; margin-top: -4px; }
.lp-mf-divider { height: 1px; background: #f0efed; margin: 2px 0; }
.lp-mf-api { font-size: 12px; font-weight: 600; color: #5b5fe3; background: rgba(91,95,227,0.06); padding: 6px 10px; border-radius: 7px; text-align: center; letter-spacing: -0.01em; }
.lp-mf-story { font-size: 12px; line-height: 1.6; color: #6b6b70; font-style: italic; border-left: 2px solid #e5e5e2; padding-left: 10px; }
.lp-mf-metric { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #f5f5f4; margin-top: auto; font-size: 11px; color: #8e8e93; }
.lp-mf-metric b { font-size: 13px; font-weight: 600; color: #c8a87c; }
.lp-mf-quote { max-width: 600px; margin: 0 auto; text-align: center; font-size: 15px; font-weight: 500; color: #171717; letter-spacing: -0.01em; line-height: 1.6; }
.lp-mf-quote span { color: #c8a87c; font-size: 20px; }
@media (max-width: 1100px) { .lp-mf-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .lp-mf-grid { grid-template-columns: 1fr; } .lp-mf-card { padding: 18px 14px 14px; } }

/* ============ PLATFORMS ============ */
.lp-plat { padding: 32px clamp(16px, 4vw, 40px); text-align: center; border-bottom: 1px solid #ebebea; }
.lp-plat p { font-size: 12px; color: #6b6b70; margin: 0 0 12px; letter-spacing: 0.04em; text-transform: uppercase; }
.lp-plat-row { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; }
.lp-plat-row span { font-size: 14px; color: #6b6b70; }

/* ============ SECTION HEADER ============ */
.lp-sec-hd { text-align: center; margin-bottom: 48px; }
.lp-sec-tag { font-size: 11px; color: #6b6b70; letter-spacing: 0.06em; text-transform: uppercase; display: block; margin-bottom: 12px; }
.lp-sec-hd h2 { font-size: clamp(24px, 4vw, 36px); font-weight: 500; letter-spacing: -0.03em; color: #171717; margin: 0 0 12px; }
.lp-sec-hd p { font-size: 15px; color: #6b6b70; max-width: 480px; margin: 0 auto; line-height: 1.6; }

/* ============ FEATURES ============ */
.lp-feat { padding: 80px clamp(16px, 4vw, 40px); }
.lp-feat-tabs { display: flex; gap: 4px; justify-content: center; margin-bottom: 40px; background: rgba(0,0,0,0.04); border-radius: 10px; padding: 4px; width: fit-content; margin-left: auto; margin-right: auto; }
.lp-feat-tabs button {
  padding: 7px 20px; border: none; background: transparent; border-radius: 7px;
  font-size: 13px; color: #6b6b70; cursor: pointer; transition: all 0.2s; font-weight: 500;
}
.lp-feat-tabs button.on { background: #fff; color: #171717; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.lp-feat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; max-width: 1200px; margin: 0 auto; }

.lp-card {
  background: #fff; border: 1px solid #ebebea; border-radius: 12px; padding: 24px;
  cursor: pointer; transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.lp-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.07); border-color: #d9d9d7; }
.lp-card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
.lp-card-ico { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.lp-card-ai {
  font-size: 10px; font-weight: 600; letter-spacing: 0.04em; color: #5b5fe3;
  background: rgba(91,95,227,0.08); padding: 3px 8px; border-radius: 5px;
}
.lp-card h3 { font-size: 15px; font-weight: 500; color: #171717; margin: 0 0 6px; letter-spacing: -0.01em; }
.lp-card p { font-size: 13px; color: #6b6b70; line-height: 1.55; margin: 0 0 14px; }
.lp-card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.lp-card-tags span { font-size: 11px; color: #8e8e93; background: rgba(0,0,0,0.04); padding: 3px 8px; border-radius: 5px; }

/* ============ HOW ============ */
.lp-how { padding: 80px clamp(16px, 4vw, 40px); background: #fff; border-top: 1px solid #ebebea; border-bottom: 1px solid #ebebea; }
.lp-how-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 960px; margin: 0 auto; }
.lp-step { text-align: center; padding: 32px 20px; }
.lp-step-num { width: 32px; height: 32px; border-radius: 50%; background: #171717; color: #fafaf9; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; margin-bottom: 16px; }
.lp-step-ico { font-size: 32px; margin-bottom: 14px; }
.lp-step h3 { font-size: 16px; font-weight: 500; color: #171717; margin: 0 0 8px; letter-spacing: -0.01em; }
.lp-step p { font-size: 13px; color: #6b6b70; line-height: 1.55; margin: 0; }

/* ============ USE CASES ============ */
.lp-cases { padding: 80px clamp(16px, 4vw, 40px); }
.lp-cases-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; max-width: 1000px; margin: 0 auto; }
.lp-case { background: #fff; border: 1px solid #ebebea; border-radius: 12px; padding: 28px; }
.lp-case-av { width: 44px; height: 44px; border-radius: 50%; background: #f5f5f4; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 16px; }
.lp-case h3 { font-size: 15px; font-weight: 500; color: #171717; margin: 0 0 4px; }
.lp-case-role { font-size: 12px; color: #b0b0b5; margin: 0 0 14px; }
.lp-case ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.lp-case li { font-size: 13px; color: #6b6b70; padding-left: 16px; position: relative; }
.lp-case li::before { content: ''; position: absolute; left: 0; top: 7px; width: 5px; height: 5px; border-radius: 50%; background: #c8a87c; }

/* ============ PRICING ============ */
.lp-price { padding: 80px clamp(16px, 4vw, 40px); background: #fff; border-top: 1px solid #ebebea; }
.lp-price-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; max-width: 960px; margin: 0 auto; }
.lp-plan { background: #fafaf9; border: 1px solid #ebebea; border-radius: 12px; padding: 32px 24px; text-align: center; position: relative; transition: all 0.3s; }
.lp-plan:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.05); }
.lp-plan.pop { background: #171717; border-color: #171717; transform: scale(1.03); }
.lp-plan.pop:hover { transform: scale(1.03) translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.15); }
.lp-plan-badge { position: absolute; top: -11px; left: 50%; transform: translateX(-50%); background: #c8a87c; color: #fff; font-size: 11px; font-weight: 500; padding: 4px 14px; border-radius: 999px; white-space: nowrap; }
.lp-plan-ico { font-size: 28px; margin-bottom: 12px; }
.lp-plan h3 { font-size: 16px; font-weight: 500; color: #171717; margin: 0 0 12px; }
.lp-plan.pop h3 { color: #fafaf9; }
.lp-plan-pr { margin-bottom: 20px; }
.lp-plan-pr b { font-size: 36px; font-weight: 500; color: #171717; letter-spacing: -0.03em; }
.lp-plan.pop .lp-plan-pr b { color: #fafaf9; }
.lp-plan-pr span { font-size: 13px; color: #6b6b70; }
.lp-plan.pop .lp-plan-pr span { color: #b0b0b5; }
.lp-plan-feat { list-style: none; padding: 0; margin: 0 0 24px; display: flex; flex-direction: column; gap: 10px; }
.lp-plan-feat li { font-size: 13px; color: #6b6b70; }
.lp-plan.pop .lp-plan-feat li { color: #d9d9d7; }
.lp-plan-btn {
  width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ebebea;
  background: #fff; color: #171717; font-size: 14px; font-weight: 500; cursor: pointer;
  transition: all 0.2s;
}
.lp-plan-btn.on { background: #fafaf9; color: #171717; border-color: #d9d9d7; font-weight: 500; }
.lp-plan-btn:hover { border-color: #c5c5c2; }
.lp-plan-btn.on:hover { background: #f0efed; }
.lp-plan.pop .lp-plan-btn { background: #fafaf9; color: #171717; border: none; }
.lp-plan.pop .lp-plan-btn:hover { background: #ebebea; }

/* ============ FAQ ============ */
.lp-faq { padding: 80px clamp(16px, 4vw, 40px); }
.lp-faq-list { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; }
.lp-faq-it { border: 1px solid #ebebea; border-radius: 10px; overflow: hidden; cursor: pointer; transition: all 0.2s; }
.lp-faq-it:hover { border-color: #d9d9d7; }
.lp-faq-it.on { border-color: #c5c5c2; background: #fff; }
.lp-faq-q { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; font-size: 14px; font-weight: 500; color: #171717; }
.lp-faq-arw { font-size: 18px; color: #6b6b70; font-weight: 400; transition: transform 0.3s; }
.lp-faq-it.on .lp-faq-arw { color: #171717; }
.lp-faq-a { max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.35s ease; }
.lp-faq-it.on .lp-faq-a { max-height: 200px; padding: 0 20px 16px; }
.lp-faq-a p { font-size: 13px; color: #6b6b70; line-height: 1.6; margin: 0; }

/* ============ CTA ============ */
.lp-cta { padding: 80px clamp(16px, 4vw, 40px); }
.lp-cta-card {
  position: relative; max-width: 680px; margin: 0 auto; padding: 56px 32px;
  background: #171717; border-radius: 16px; text-align: center; overflow: hidden;
}
.lp-cta-glow { position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(91,95,227,0.25), transparent 60%); pointer-events: none; }
.lp-cta h2 { font-size: clamp(22px, 3.5vw, 30px); font-weight: 500; color: #fafaf9; margin: 0 0 12px; letter-spacing: -0.03em; position: relative; }
.lp-cta p { font-size: 15px; color: #b0b0b5; margin: 0 0 28px; position: relative; }
.lp-cta-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; position: relative; }
.lp-cta-link { font-size: 14px; color: #b0b0b5; text-decoration: none; padding: 12px 20px; transition: color 0.2s; }
.lp-cta-link:hover { color: #fafaf9; }

/* ============ FOOTER ============ */
.lp-foot { padding: 48px clamp(16px, 4vw, 40px) 24px; border-top: 1px solid #ebebea; }
.lp-foot-in { max-width: 960px; margin: 0 auto; display: flex; gap: 80px; flex-wrap: wrap; justify-content: space-between; margin-bottom: 32px; }
.lp-foot-brand { max-width: 240px; }
.lp-foot-logo { width: 28px; height: 28px; background: #171717; color: #fafaf9; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; margin-bottom: 12px; }
.lp-foot-name { font-size: 15px; font-weight: 500; color: #171717; display: block; margin-bottom: 8px; }
.lp-foot-brand p { font-size: 13px; color: #6b6b70; margin: 0; line-height: 1.5; }
.lp-foot-lk { display: flex; gap: 64px; }
.lp-foot-lk h4 { font-size: 12px; font-weight: 500; color: #171717; margin: 0 0 12px; letter-spacing: 0.03em; }
.lp-foot-lk a { display: block; font-size: 13px; color: #6b6b70; text-decoration: none; margin-bottom: 8px; transition: color 0.15s; }
.lp-foot-lk a:hover { color: #171717; }
.lp-foot-bot { max-width: 960px; margin: 0 auto; padding-top: 20px; border-top: 1px solid #f0efed; text-align: center; }
.lp-foot-bot span { font-size: 12px; color: #b0b0b5; }

/* ============ TRANSITIONS ============ */
.sd-enter-active, .sd-leave-active { transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
.sd-enter-from, .sd-leave-to { opacity: 0; transform: translateY(-8px); }

/* ============ RESPONSIVE ============ */
@media (max-width: 1100px) {
  .lp-nav-lk { display: none; }
  .lp-ham { display: flex; }
  .lp-how-row { grid-template-columns: 1fr; max-width: 400px; }
  .lp-foot-in { gap: 40px; }
  .lp-foot-lk { gap: 40px; }
}

@media (max-width: 768px) {
  .lp-nav { height: 48px; }
  .lp-hero { padding: 96px 16px 56px; }
  .lp-hero-h1 { font-size: 28px; }
  .lp-hero-p { font-size: 15px; }
  .lp-hero-mock { display: none; }
  .lp-hero-mob { display: block; }
  .lp-hero-nums { gap: 16px; }
  .lp-hero-nums b { font-size: 22px; }
  .lp-hero-nums i { height: 24px; }
  .lp-feat { padding: 56px 16px; }
  .lp-feat-tabs button { padding: 6px 14px; font-size: 12px; }
  .lp-feat-grid { grid-template-columns: 1fr; }
  .lp-how { padding: 56px 16px; }
  .lp-cases { padding: 56px 16px; }
  .lp-cases-grid { grid-template-columns: 1fr; }
  .lp-price { padding: 56px 16px; }
  .lp-price-grid { grid-template-columns: 1fr; max-width: 400px; }
  .lp-plan.pop { transform: none; }
  .lp-plan.pop:hover { transform: translateY(-2px); }
  .lp-faq { padding: 56px 16px; }
  .lp-cta { padding: 56px 16px; }
  .lp-cta-card { padding: 40px 20px; }
  .lp-foot-in { flex-direction: column; gap: 32px; }
  .lp-foot-lk { gap: 32px; flex-wrap: wrap; }
}

@media (max-width: 480px) {
  .lp-hero-btns { flex-direction: column; align-items: center; }
  .lp-hero-cta, .lp-hero-demo { width: 100%; justify-content: center; }
  .lp-nav-act .lp-btn-ghost { display: none; }
  .lp-nav-act .lp-btn-main { padding: 6px 14px; font-size: 12px; }
}
</style>
