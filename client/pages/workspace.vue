<template>
  <div class="ws-app">
    <!-- HEADER -->
    <header class="ws-header">
      <div class="ws-header-inner">
        <!-- Logo -->
        <div class="ws-hdr-logo" @click="navigateTo('/')">
          <span class="ws-hdr-dot"></span>
          <span class="ws-hdr-brand">Movio AI</span>
        </div>

        <!-- Center tabs -->
        <nav class="ws-hdr-tabs">
          <button
            v-for="tab in displayTabs"
            :key="tab.id"
            class="ws-hdr-tab"
            :class="{ sel: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >{{ tab.label }}</button>
        </nav>

        <!-- Spacer -->
        <div class="ws-hdr-spacer"></div>

        <!-- Right actions -->
        <div class="ws-hdr-actions">
          <button class="ws-hdr-icon" @click="searchOpen = !searchOpen" title="搜索">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <button class="ws-hdr-icon" @click="toggleTheme" :title="theme === 'dark' ? '亮色' : '暗色'">
            <svg v-if="theme === 'dark'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <button class="ws-hdr-icon" @click="navigateTo('/notifications')" title="通知" style="position:relative">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span v-if="unreadCount" class="ws-notif-dot">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </button>

          <!-- User -->
          <template v-if="user">
            <div class="ws-hdr-user" @click="menuOpen = !menuOpen">
              <span class="ws-hdr-av">{{ user.nickname?.[0] || 'U' }}</span>
              <span class="ws-hdr-name">{{ user.nickname }}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div v-if="menuOpen" class="ws-hdr-menu" @click.stop>
              <button @click="navigateTo('/account/settings'); menuOpen = false">个人设置</button>
              <button @click="navigateTo('/account/membership'); menuOpen = false">我的会员</button>
              <button @click="navigateTo('/account/billing'); menuOpen = false">消费账单</button>
              <button v-if="user?.role === 'admin'" @click="navigateTo('/admin/dashboard'); menuOpen = false" class="ws-admin-link">管理后台</button>
              <hr />
              <button @click="doLogout">退出登录</button>
            </div>
          </template>
          <template v-else>
            <button class="ws-hdr-login" @click="navigateTo('/login')">登录</button>
            <button class="ws-hdr-signup" @click="navigateTo('/register')">免费注册</button>
          </template>

          <button class="ws-hdr-burger" @click="mobileMenuOpen = !mobileMenuOpen">
            <svg v-if="!mobileMenuOpen" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- Search -->
      <div v-if="searchOpen" class="ws-search">
        <input v-model="searchQuery" ref="searchInput" type="text" placeholder="搜索功能..." class="ws-search-inp" @keydown.esc="searchOpen = false; searchQuery = ''" @keydown.enter="doSearch" />
        <div v-if="searchQuery && searchResults.length" class="ws-search-list">
          <button v-for="r in searchResults" :key="r.path" class="ws-search-it" @click="closeSearch(); navigateTo(r.path)">
            <span>{{ r.icon }}</span><span>{{ r.name }}</span><span class="ws-search-tag">{{ r.tag }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- BODY -->
    <div class="ws-body">
      <!-- SIDEBAR -->
      <aside v-if="sidebarVisible" class="ws-side" :class="{ open: sidebarOpen }">
        <div class="ws-side-logo" @click="navigateTo('/')">
          <span class="ws-side-dot"></span>
          <span class="ws-side-brand">Movio AI</span>
        </div>

        <nav class="ws-side-nav">
          <button v-for="item in displayNavItems" :key="item.id" class="ws-side-btn" :class="{ sel: activeNav === item.id }" @click="activeNav = item.id">
            <span class="ws-side-dot-sm"></span>
            <span>{{ item.label }}</span>
          </button>
        </nav>

        <!-- Stats -->
        <div class="ws-side-stats">
          <div class="ws-side-stat">
            <b>{{ userStats.todayTasks }}</b>
            <span>今日任务</span>
          </div>
          <div class="ws-side-stat">
            <b>{{ userStats.credits }}</b>
            <span>剩余积分</span>
          </div>
          <div class="ws-side-stat">
            <b>{{ userStats.totalWorks }}</b>
            <span>累计作品</span>
          </div>
        </div>

        <!-- Recent tasks -->
        <div class="ws-side-tasks">
          <span class="ws-side-sec">最近任务</span>
          <div class="ws-side-task-list">
            <div v-for="t in recentTasks" :key="t.id" class="ws-side-task" @click="navigateTo(t.route)">
              <span class="ws-side-task-dot" :class="t.status"></span>
              <div class="ws-side-task-info">
                <span class="ws-side-task-name">{{ t.title }}</span>
                <span class="ws-side-task-time">{{ t.time }}</span>
              </div>
              <span class="ws-side-task-st" :class="t.status">{{ t.statusText }}</span>
            </div>
          </div>
        </div>

        <!-- Upgrade -->
        <div v-if="user && user.role !== 'admin'" class="ws-side-upgrade" @click="navigateTo('/account/membership')">
          <span class="ws-side-up-icon">⚡</span>
          <strong>升级专业版</strong>
          <span>无限生成</span>
        </div>

        <!-- Bottom -->
        <div class="ws-side-bottom">
          <button class="ws-side-btn" @click="navigateTo('/my/works')"><span class="ws-side-dot-sm"></span>素材库</button>
          <button class="ws-side-btn" @click="navigateTo('/account/settings')"><span class="ws-side-dot-sm"></span>设置</button>
        </div>
      </aside>

      <div v-if="sidebarVisible && sidebarOpen" class="ws-side-overlay" @click="sidebarOpen = false" />

      <!-- MAIN -->
      <main class="ws-main">
        <div class="ws-main-ct">
          <!-- Title -->
          <div class="ws-ttl-row">
            <button class="ws-side-tog" @click="sidebarOpen = !sidebarOpen">
              <span class="ws-side-tog-bar" :class="{ a: sidebarOpen }" />
              <span class="ws-side-tog-bar" :class="{ a: sidebarOpen }" />
              <span class="ws-side-tog-bar" :class="{ a: sidebarOpen }" />
            </button>
            <h1 class="ws-ttl">AI 创作工作台</h1>
          </div>

          <!-- INPUT CARD -->
          <div class="ws-inp-card">
            <div class="ws-inp-row">
              <button class="ws-inp-upload" @click="triggerUpload">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>参考图</span>
              </button>
              <textarea v-model="taskPrompt" :placeholder="currentPlaceholder" rows="3" class="ws-inp-ta" @keydown.enter.ctrl="submitPrompt"></textarea>
              <button class="ws-inp-send" :disabled="!taskPrompt.trim()" @click="submitPrompt">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
              </button>
            </div>

            <!-- Intent -->
            <div v-if="intentHint" class="ws-inp-hint">
              <span>🤖</span>
              <span>检测意图：<strong>{{ intentHint.tool }}</strong></span>
              <span v-if="intentHint.confidence >= 30" class="ws-inp-hint-tag">{{ intentHint.confidence }}% 匹配</span>
              <span v-if="intentHint.platform" class="ws-inp-hint-plat">{{ intentHint.platform }}</span>
            </div>

            <!-- Params -->
            <div class="ws-inp-params">
              <div class="ws-inp-pg">
                <span class="ws-inp-pl">尺寸</span>
                <button v-for="r in ['1:1','3:4','4:3','9:16','16:9']" :key="r" class="ws-inp-chip" :class="{ a: selectedRatio === r }" @click="selectedRatio = r">{{ r }}</button>
              </div>
              <span class="ws-inp-div"></span>
              <div class="ws-inp-pg">
                <span class="ws-inp-pl">风格</span>
                <button v-for="s in ['原图','简约','科技','自然','复古']" :key="s" class="ws-inp-chip" :class="{ a: selectedStyle === s }" @click="selectedStyle = s">{{ s }}</button>
              </div>
              <span class="ws-inp-div"></span>
              <div class="ws-inp-pg">
                <span class="ws-inp-pl">数量</span>
                <button v-for="n in [1,2,3,4]" :key="n" class="ws-inp-chip" :class="{ a: selectedCount === n }" @click="selectedCount = n">{{ n }}张</button>
              </div>
            </div>
          </div>

          <!-- Quick tags -->
          <div class="ws-tags">
            <span class="ws-tags-lbl">试试：</span>
            <button v-for="tag in currentQuickTags" :key="tag" class="ws-tag" @click="taskPrompt = tag">{{ tag }}</button>
          </div>

          <!-- Quick function cards -->
          <div class="ws-qf-row">
            <div class="ws-qf-card" @click="navigateTo('/work/script-gen')">
              <div class="ws-qf-l">
                <span class="ws-qf-icon">✨</span>
                <div><strong>提示词润色</strong><p>AI 帮你优化提示词，让生成效果更精准</p></div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </div>
            <div class="ws-qf-card" @click="navigateTo('/work/viral-clone')">
              <div class="ws-qf-l">
                <span class="ws-qf-icon">🔥</span>
                <div><strong>爆款复刻</strong><p>分析爆款视频结构，一键复刻热门模板</p></div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </div>
          </div>

          <!-- Tool cards -->
          <div class="ws-sec">
            <div class="ws-sec-hd">
              <h2 class="ws-sec-ttl">{{ activeTabLabel }}工具</h2>
              <NuxtLink to="/compare" class="ws-sec-more">查看全部 →</NuxtLink>
            </div>
            <div class="ws-grid">
              <div v-for="card in displayCurrentCards" :key="card.id" class="ws-card" @click="navigateTo(card.route)">
                <span v-if="card.hot" class="ws-card-badge">热门</span>
                <div class="ws-card-ico" :style="{ background: card.bgColor }">{{ card.icon }}</div>
                <h3 class="ws-card-t">{{ card.title }}</h3>
                <p class="ws-card-d">{{ card.desc }}</p>
              </div>
            </div>
          </div>

          <!-- Recent -->
          <div class="ws-sec">
            <div class="ws-sec-hd">
              <h2 class="ws-sec-ttl">最近产出</h2>
              <NuxtLink to="/my/works" class="ws-sec-more">素材库 →</NuxtLink>
            </div>
            <div class="ws-grid">
              <div v-for="item in recentResults" :key="item.id" class="ws-rec" @click="navigateTo('/my/works')">
                <div class="ws-rec-pv" :style="{ background: item.bgColor }">{{ item.icon }}</div>
                <div class="ws-rec-info">
                  <span class="ws-rec-t">{{ item.title }}</span>
                  <span class="ws-rec-m">{{ item.type }} · {{ item.time }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'landing' });

const activeNav = ref('all');
const activeTab = ref('image');
const taskPrompt = ref('');
const selectedRatio = ref('1:1');
const selectedStyle = ref('原图');
const selectedCount = ref(1);
const showRatioMenu = ref(false);
const showStyleMenu = ref(false);
const sidebarOpen = ref(false);
const sidebarVisible = ref(true);
const menuOpen = ref(false);
const mobileMenuOpen = ref(false);
const searchOpen = ref(false);
const searchQuery = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const user = ref<any>(null);
const unreadCount = ref(0);
const userStats = reactive({ todayTasks: 0, credits: 0, totalWorks: 0 });

const { theme, toggle: toggleTheme } = useTheme();

const navItems = [
  { id: 'all', icon: '🏠', label: '全部工具' },
  { id: 'image', icon: '🖼', label: '图片工具' },
  { id: 'video', icon: '🎬', label: '视频工具' },
  { id: 'batch', icon: '📦', label: '批量处理' },
];

const tabs = [
  { id: 'image', icon: '🖼', label: '图片生成' },
  { id: 'video', icon: '🎬', label: '视频生成' },
  { id: 'batch', icon: '📦', label: '批量处理' },
  { id: 'edit', icon: '✂', label: '图片编辑' },
];

const activeTabLabel = computed(() => {
  const t = displayTabs.value.find((t: any) => t.id === activeTab.value);
  return t ? t.label : '';
});

const currentPlaceholder = computed(() => {
  const map: Record<string, string> = {
    image: '例如：帮我生成一件红色连衣裙的淘宝白底主图，简约干净风格，高清光影...',
    video: '例如：把这张连衣裙主图做成15秒带货短视频，配上节奏感BGM和卖点文案...',
    batch: '例如：把文件夹里的50张商品图全部抠成白底图，统一800x800尺寸...',
    edit: '例如：把这张图的背景换成阳光明媚的咖啡厅，保留产品不变...',
  };
  return map[activeTab.value] || map.image;
});

const currentQuickTags = computed(() => {
  const map: Record<string, string[]> = {
    image: ['帮我做一张白底主图', '生成连衣裙的淘宝详情页', '把这张图换成蓝色背景'],
    video: ['把主图做成带货短视频', '生成15秒抖音商品视频', '制作产品展示动画'],
    batch: ['批量抠50张商品图', '批量生成多色SKU图', '批量添加水印'],
    edit: ['去掉背景换成白色', '给模特换件红色外套', '把产品图做成3D效果'],
  };
  return map[activeTab.value] || map.image;
});

const currentCards = computed(() => {
  const allCards: Record<string, any[]> = {
    image: [
      { id: 'main', icon: '📷', title: '智能做主图', desc: 'AI抠图+白底+精修一键生成电商主图', hot: true, bgColor: '#F5F3FF', route: '/work/main-image' },
      { id: 'scene', icon: '🖼', title: '智能做场景', desc: '产品融入AI生成的营销场景图', hot: true, bgColor: '#EDE9FE', route: '/work/scene' },
      { id: 'detail', icon: '📄', title: '智能做详情', desc: 'AI自动排版生成详情页长图', hot: false, bgColor: '#F3E8FF', route: '/work/detail-h5' },
      { id: 'tryon', icon: '👗', title: '虚拟模特', desc: '服装AI上身效果，真人模特试穿', hot: true, bgColor: '#F5F3FF', route: '/work/virtual-tryon' },
      { id: 'color', icon: '🎨', title: '一键换色', desc: '商品换色，批量生成多色SKU图', hot: false, bgColor: '#EDE9FE', route: '/work/color-swap' },
      { id: 'style', icon: '🖌', title: '风格迁移', desc: '图片转3D/水彩/油画等多种风格', hot: false, bgColor: '#F3E8FF', route: '/work/style-transfer' },
      { id: 'ghost', icon: '👻', title: '幽灵模特', desc: '假模→立体展示，告别拍摄成本', hot: false, bgColor: '#F5F3FF', route: '/work/ghost-mannequin' },
      { id: 'wrinkle', icon: '👔', title: '去褶皱', desc: '服装面料自动平整处理', hot: false, bgColor: '#EDE9FE', route: '/work/wrinkle-remove' },
    ],
    video: [
      { id: 'vid', icon: '🎬', title: '智能做视频', desc: '图片一键生成带货短视频', hot: true, bgColor: '#F5F3FF', route: '/work/video' },
      { id: 'action', icon: '🕺', title: '动作迁移', desc: '1个动作视频+N张图=批量视频', hot: true, bgColor: '#EDE9FE', route: '/work/action-transfer' },
      { id: 'digital', icon: '🎙', title: '口播数字人', desc: 'AI数字人口播讲解商品卖点', hot: true, bgColor: '#F3E8FF', route: '/work/digital-human' },
      { id: 'script', icon: '📝', title: '带货脚本', desc: 'AI生成直播带货话术脚本', hot: false, bgColor: '#F5F3FF', route: '/work/script-gen' },
      { id: 'storyboard', icon: '🎞', title: '智能分镜', desc: 'AI自动拆解场景生成分镜计划', hot: false, bgColor: '#EDE9FE', route: '/work/shot-plan' },
      { id: 'viral', icon: '🔥', title: '爆款复刻', desc: '分析爆款视频结构一键复刻', hot: false, bgColor: '#F3E8FF', route: '/work/viral-clone' },
      { id: 'edit', icon: '✂', title: '视频编辑', desc: '智能剪辑+字幕+转场+BGM', hot: false, bgColor: '#F5F3FF', route: '/work/video-edit' },
      { id: 'voice', icon: '🔊', title: '语音生成', desc: 'AI配音，多语种多音色可选', hot: false, bgColor: '#EDE9FE', route: '/work/voice-gen' },
      { id: 'voice-clone', icon: '🎙', title: '声音克隆', desc: '上传音频样本克隆专属音色', hot: false, bgColor: '#F3E8FF', route: '/work/voice-clone' },
    ],
    batch: [
      { id: 'b-main', icon: '📷', title: '批量做主图', desc: '批量抠图+白底+精修', hot: true, bgColor: '#F5F3FF', route: '/work/batch' },
      { id: 'b-scene', icon: '🖼', title: '批量做场景', desc: '批量产品场景图生成', hot: false, bgColor: '#EDE9FE', route: '/work/batch' },
      { id: 'b-video', icon: '🎬', title: '批量做视频', desc: '批量生成带货短视频', hot: false, bgColor: '#F3E8FF', route: '/work/batch' },
      { id: 'b-color', icon: '🎨', title: '批量换色', desc: '批量生成多色SKU图', hot: false, bgColor: '#F5F3FF', route: '/work/color-swap' },
    ],
    edit: [
      { id: 'e-bg', icon: '🖼', title: '去背景', desc: 'AI精准抠图去背景', hot: true, bgColor: '#F5F3FF', route: '/work/remove-bg' },
      { id: 'e-white', icon: '⬜', title: '白底图', desc: '生成纯白底商品图', hot: true, bgColor: '#EDE9FE', route: '/work/white-bg' },
      { id: 'e-retouch', icon: '✨', title: '图片精修', desc: 'AI自动美化、调色、增强', hot: false, bgColor: '#F3E8FF', route: '/work/retouch' },
      { id: 'e-outpaint', icon: '↔', title: '智能扩图', desc: 'AI扩展图片边缘构图', hot: false, bgColor: '#F5F3FF', route: '/work/outpaint' },
      { id: 'e-translate', icon: '🌐', title: '图片翻译', desc: '图片文字翻译+排版适配', hot: false, bgColor: '#EDE9FE', route: '/work/image-translate' },
      { id: 'e-replace', icon: '🧑', title: '人物替换', desc: 'AI替换模特/人物保留服装', hot: false, bgColor: '#F3E8FF', route: '/work/person-replace' },
      { id: 'e-main', icon: '📷', title: '做主图', desc: '完整主图流程：抠图→修图→水印', hot: false, bgColor: '#F5F3FF', route: '/work/main-image' },
    ],
  };
  return allCards[activeTab.value] || allCards.image;
});

const recentTasks = [
  { id: 'rt1', icon: '📷', title: '夏季连衣裙主图', time: '10分钟前', status: 'done', statusText: '已完成', route: '/my/works' },
  { id: 'rt2', icon: '🎬', title: '连衣裙带货视频', time: '2小时前', status: 'done', statusText: '已完成', route: '/my/works' },
  { id: 'rt3', icon: '📦', title: '批量生成-20件', time: '昨天', status: 'done', statusText: '已完成', route: '/my/works' },
  { id: 'rt4', icon: '🕺', title: '模特动作迁移', time: '昨天', status: 'running', statusText: '处理中', route: '/my/works' },
];

const recentResults = [
  { id: 'rr1', icon: '🖼', title: '连衣裙-白底主图', type: '做主图', time: '刚刚', bgColor: '#F5F3FF' },
  { id: 'rr2', icon: '🎬', title: '夏季新品带货', type: '做视频', time: '1小时前', bgColor: '#EDE9FE' },
  { id: 'rr3', icon: '📄', title: 'T恤详情页', type: '做详情', time: '3小时前', bgColor: '#F3E8FF' },
  { id: 'rr4', icon: '🖼', title: '咖啡馆场景', type: '做场景', time: '昨天', bgColor: '#F5F3FF' },
];

const intentHint = computed(() => {
  if (!taskPrompt.value || taskPrompt.value.trim().length < 2) return null
  const intent = parseIntent(taskPrompt.value)
  if (!intent.matched) return null
  return { tool: intent.tool, confidence: intent.confidence, platform: intent.detectedPlatform }
})

function submitPrompt() {
  if (!taskPrompt.value.trim()) return
  const intent = parseIntent(taskPrompt.value)
  if (intent.matched && intent.confidence >= 15) {
    const enhanced = enhancePrompt(taskPrompt.value, {
      platform: intent.detectedPlatform || undefined,
      category: intent.tool.includes('视频') ? undefined : 'ecommerce',
    })
    sessionStorage.setItem('movio_prompt', enhanced.enhanced)
    sessionStorage.setItem('movio_intent_tool', intent.tool)
    navigateTo(intent.route)
  } else if (intent.suggestions.length > 0) {
    navigateTo(intent.suggestions[0].route)
  } else {
    navigateTo('/work/main-image')
  }
}

function triggerUpload() {
  taskPrompt.value = taskPrompt.value || '请参考上传的图片，';
}

async function loadUserData() {
  try {
    const res: any = await $fetch('/api/user/profile');
    if (res.code === 200) {
      user.value = res.data;
      userStats.credits = res.data.points_balance || 0;
    }
    // 加载统计数据
    try {
      const statsRes: any = await $fetch('/api/user/stats');
      if (statsRes.code === 200) {
        userStats.todayTasks = statsRes.data.todayTasks || 0;
        userStats.totalWorks = statsRes.data.totalTasks || 0;
      }
    } catch { /* defaults */ }
    // 加载最近任务
    loadRecentTasks();
    loadRecentWorks();
    loadUnread();
  } catch { user.value = null; }
}

async function loadRecentTasks() {
  try {
    const res: any = await $fetch('/api/job/0', { params: {} }).catch(() => null);
    // 使用 /api/assets/list 获取最近的已完成任务作为"最近任务"
    const assetsRes: any = await $fetch('/api/assets/list', { params: { page: 1, pageSize: 4 } }).catch(() => null);
    if (assetsRes?.code === 200 && assetsRes.data?.list?.length > 0) {
      recentTasks.length = 0;
      assetsRes.data.list.forEach((item: any, i: number) => {
        const typeMap: Record<string, { icon: string; name: string }> = {
          image_gen: { icon: '📷', name: 'AI生图' },
          image_replicate: { icon: '📷', name: '主图复刻' },
          video_gen: { icon: '🎬', name: 'AI视频' },
          action_migrate: { icon: '🕺', name: '动作迁移' },
          digital_human: { icon: '🎙', name: '数字人' },
        };
        const info = typeMap[item.task_type] || { icon: '📦', name: item.task_type };
        const now = new Date();
        const created = new Date(item.created_at);
        const diff = Math.floor((now.getTime() - created.getTime()) / 60000);
        const timeStr = diff < 60 ? `${diff}分钟前` : diff < 1440 ? `${Math.floor(diff/60)}小时前` : '昨天';
        recentTasks.push({
          id: `rt${i}`, icon: info.icon, title: info.name,
          time: timeStr, status: 'done', statusText: '已完成', route: '/assets',
        });
      });
    }
  } catch {}
}

async function loadRecentWorks() {
  try {
    const res: any = await $fetch('/api/assets/list', { params: { page: 1, pageSize: 4 } }).catch(() => null);
    if (res?.code === 200 && res.data?.list?.length > 0) {
      recentResults.length = 0;
      const colors = ['#F5F3FF', '#EDE9FE', '#F3E8FF', '#DBEAFE'];
      const typeLabels: Record<string, string> = {
        image_gen: '生图', image_replicate: '复刻', video_gen: '视频',
        action_migrate: '动作迁移', digital_human: '数字人', viral_replicate: '爆款复刻',
      };
      res.data.list.forEach((item: any, i: number) => {
        recentResults.push({
          id: `rr${i}`, icon: item.type === 'video' ? '🎬' : '🖼',
          title: typeLabels[item.task_type] || item.task_type,
          type: item.type === 'video' ? '做视频' : '做图片',
          time: '刚刚', bgColor: colors[i % colors.length],
        });
      });
    }
  } catch {}
}

async function loadUnread() {
  try {
    const res: any = await $fetch('/api/notifications/unread-count');
    unreadCount.value = res.data?.count || 0;
  } catch { /* noop */ }
}

async function doLogout() {
  menuOpen.value = false;
  mobileMenuOpen.value = false;
  await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
  user.value = null;
  navigateTo('/login');
}

const { data: siteConfig } = await useAsyncData('site-config-workspace', () =>
  $fetch<any>(`${useRuntimeConfig().public.apiBase}/site-config/public`).catch(() => ({}))
);

const workspaceTools = computed(() => {
  const cfg: any = siteConfig.value;
  if (cfg && Array.isArray(cfg.workspace_tools) && cfg.workspace_tools.length)
    return cfg.workspace_tools;
  return null;
});

const displayNavItems = computed(() => {
  if (workspaceTools.value) {
    const items = [{ id: 'all', icon: '🏠', label: '全部工具' }];
    workspaceTools.value.forEach((g: any) => items.push({ id: g.id, icon: g.icon, label: g.name }));
    return items;
  }
  return navItems;
});

const displayTabs = computed(() => {
  if (workspaceTools.value) {
    return workspaceTools.value.map((g: any) => ({ id: g.id, icon: g.icon, label: g.name }));
  }
  return tabs;
});

const displayCards = computed(() => {
  if (workspaceTools.value) {
    const map: Record<string, any[]> = {};
    const colors = ['#F5F3FF', '#EDE9FE', '#F3E8FF', '#DBEAFE', '#D1FAE5', '#FEF3C7', '#FCE7F3', '#FFF7ED'];
    workspaceTools.value.forEach((g: any, gi: number) => {
      map[g.id] = (g.children || []).map((c: any, ci: number) => ({
        id: `${g.id}-${ci}`,
        icon: c.icon || '📷',
        title: c.name,
        desc: c.desc || '',
        hot: ci < 3,
        bgColor: colors[(gi * g.children.length + ci) % colors.length],
        route: c.route || '/work/main-image'
      }));
    });
    return map;
  }
  return null;
});

const displayCurrentCards = computed(() => {
  if (displayCards.value) {
    return displayCards.value[activeTab.value] || displayCards.value[Object.keys(displayCards.value)[0]] || [];
  }
  return currentCards.value;
});

const searchIndex = [
  { name: '做主图', path: '/work/main-image', icon: '📷', tag: '图片', kw: ['主图'] },
  { name: '做场景', path: '/work/scene', icon: '🖼', tag: '图片', kw: ['场景'] },
  { name: '做详情', path: '/work/detail-h5', icon: '📄', tag: '图片', kw: ['详情页'] },
  { name: '做视频', path: '/work/video', icon: '🎬', tag: '视频', kw: ['短视频'] },
  { name: '批量处理', path: '/work/batch', icon: '📦', tag: '批量', kw: ['批量'] },
  { name: '素材库', path: '/my/works', icon: '🗂', tag: '管理', kw: ['作品'] },
  { name: '虚拟模特', path: '/work/virtual-tryon', icon: '👗', tag: '图片', kw: ['试穿'] },
  { name: '一键换色', path: '/work/color-swap', icon: '🎨', tag: '图片', kw: ['换色'] },
  { name: '去背景', path: '/work/remove-bg', icon: '🖼', tag: '图片', kw: ['抠图'] },
  { name: '白底图', path: '/work/white-bg', icon: '⬜', tag: '图片', kw: ['白底'] },
  { name: '爆款复刻', path: '/work/viral-clone', icon: '🔥', tag: '视频', kw: ['爆款'] },
  { name: '数字人', path: '/work/digital-human', icon: '🎙', tag: '视频', kw: ['口播'] },
];

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return [];
  return searchIndex.filter(item =>
    item.name.toLowerCase().includes(q) || item.tag.toLowerCase().includes(q) || item.kw.some((k: string) => k.toLowerCase().includes(q))
  ).slice(0, 8);
});

function doSearch() { if (searchResults.value.length > 0) { closeSearch(); navigateTo(searchResults.value[0].path); } }
function closeSearch() { searchOpen.value = false; searchQuery.value = ''; }

watch(searchOpen, v => { if (v) nextTick(() => searchInput.value?.focus()); });
watch(() => useRoute().path, () => { menuOpen.value = false; mobileMenuOpen.value = false; });

onMounted(() => {
  loadUserData();
  onResize();
  window.addEventListener('resize', onResize);
});
onUnmounted(() => window.removeEventListener('resize', onResize));
function onResize() {
  sidebarVisible.value = window.innerWidth > 480;
  if (window.innerWidth > 768) sidebarOpen.value = false;
}
</script>

<style scoped>
/* ================================================
   WORKSPACE APP SHELL
   ================================================ */
.ws-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--ws-bg);
  overflow: hidden;
}

/* ================================================
   HEADER — 60px, full-width, glass-morphism
   ================================================ */
.ws-header {
  height: 60px;
  background: rgba(255,255,255,0.8);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  flex-shrink: 0;
  z-index: 100;
  position: relative;
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
}
[data-theme="dark"] .ws-header {
  background: rgba(15,17,23,0.82);
}

.ws-header-inner {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0 28px;
  gap: 28px;
}

/* Header Left — Logo */
.ws-header-left { flex-shrink: 0; }
.ws-header-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}
.ws-header-logo:hover { opacity: 0.8; }
.ws-header-brand {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

/* Header Center — Pill Tab Navigation */
.ws-header-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  justify-content: center;
  padding: 4px;
  background: var(--bg-hover);
  border-radius: 100px;
}

.ws-header-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  border: none;
  border-radius: 100px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  letter-spacing: 0.01em;
}

.ws-header-tab:hover { color: var(--text-primary); background: rgba(0,0,0,0.03); }
[data-theme="dark"] .ws-header-tab:hover { background: rgba(255,255,255,0.04); }
.ws-header-tab.active {
  background: #fff;
  color: var(--text-primary);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.03);
}
[data-theme="dark"] .ws-header-tab.active {
  background: #1e2130;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.ws-header-tab-icon { font-size: 15px; line-height: 1; }
.ws-header-tab-label { font-size: 13px; line-height: 1; }

/* Header Right — Actions */
.ws-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ws-header-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px; height: 36px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}
.ws-header-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

.notif-btn { position: relative; }
.notif-badge {
  position: absolute;
  top: 2px; right: 2px;
  width: 16px; height: 16px;
  background: var(--brand);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* User */
.ws-header-user {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.ws-header-user:hover { background: var(--bg-hover); }
.ws-header-avatar {
  width: 30px; height: 30px;
  background: var(--brand-gradient);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}
.ws-header-uname { font-size: 13px; color: var(--text-primary); white-space: nowrap; }

.ws-header-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  box-shadow: var(--shadow-dropdown);
  min-width: 180px;
  padding: 6px;
  z-index: 200;
  animation: modal-enter var(--transition-base) ease-out;
}
.ws-header-dropdown button {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--text-primary);
  text-align: left;
  border-radius: 8px;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.ws-header-dropdown button:hover { background: var(--bg-hover); }
.ws-header-dropdown .admin-link { color: var(--brand) !important; font-weight: 600; }
.ws-header-dropdown hr { border: none; border-top: 1px solid var(--border-light); margin: 4px 8px; }

.ws-header-login-btn {
  padding: 7px 16px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.ws-header-login-btn:hover { border-color: var(--brand); color: var(--brand); }

.ws-header-register-btn {
  padding: 7px 16px;
  border: none;
  border-radius: 8px;
  background: var(--brand-gradient);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.ws-header-register-btn:hover { box-shadow: 0 2px 12px var(--brand-alpha-30); }

.ws-header-hamburger {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px; height: 36px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

/* Search Panel */
.ws-search-panel {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 480px;
  max-width: calc(100vw - 32px);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  box-shadow: var(--shadow-dropdown);
  padding: 12px;
  z-index: 200;
  animation: modal-enter var(--transition-base) ease-out;
}
.ws-search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: var(--bg-input);
  color: var(--text-primary);
  margin-bottom: 8px;
}
.ws-search-input:focus { border-color: var(--brand); }
.ws-search-results { display: flex; flex-direction: column; gap: 2px; }
.ws-search-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--text-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.ws-search-item:hover { background: var(--bg-hover); }
.ws-search-tag { font-size: 11px; color: var(--text-muted); background: var(--tag-bg); padding: 1px 6px; border-radius: 4px; margin-left: auto; }

/* ================================================
   BODY — flex row, fills remaining height
   ================================================ */
.ws-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.ws-body::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, var(--ws-dot-color) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
  z-index: 0;
}

/* ================================================
   LEFT SIDEBAR
   ================================================ */
.ws-sidebar {
  width: var(--ws-sidebar-width);
  background: var(--ws-sidebar-bg);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 10;
  padding: 0 12px;
  overflow-y: auto;
  scrollbar-gutter: stable;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ws-side-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 4px 16px;
  cursor: pointer;
}
.ws-side-brand {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}
.ws-side-logo:hover .ws-side-brand { color: var(--brand); }

/* Sidebar Nav */
.ws-side-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
  flex-shrink: 0;
}

.ws-nav-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  position: relative;
}
.ws-nav-btn:hover { background: var(--ws-sidebar-hover); color: var(--text-primary); }
.ws-nav-btn.active {
  background: var(--ws-sidebar-active);
  color: var(--brand);
  font-weight: 600;
}
.ws-nav-btn.active::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 22px;
  background: var(--brand);
  border-radius: 0 3px 3px 0;
}
.ws-nav-icon { font-size: 18px; width: 24px; text-align: center; flex-shrink: 0; }
.ws-nav-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Stats */
.ws-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 8px 2px;
  flex-shrink: 0;
}
.ws-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 4px;
  background: var(--ws-card);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  transition: all var(--transition-fast);
}
[data-theme="dark"] .ws-stat-item {
  background: var(--bg-card);
  border-color: var(--border-light);
}
.ws-stat-item:hover { border-color: var(--brand); }
.ws-stat-value { font-size: 18px; font-weight: 800; color: var(--brand); }
.ws-stat-label { font-size: 10px; color: var(--text-muted); white-space: nowrap; }

/* Recent Tasks */
.ws-recent-tasks {
  flex: 1;
  overflow-y: auto;
  padding: 0 2px;
  min-height: 0;
}
.ws-panel-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 12px 0 8px;
  padding: 0 4px;
}
.ws-task-list { display: flex; flex-direction: column; gap: 1px; }
.ws-task-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.ws-task-item:hover { background: var(--ws-sidebar-hover); }
.ws-task-icon { font-size: 13px; flex-shrink: 0; }
.ws-task-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ws-task-name { font-size: 11px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ws-task-time { font-size: 10px; color: var(--text-muted); }
.ws-task-status { font-size: 10px; padding: 2px 6px; border-radius: 4px; flex-shrink: 0; font-weight: 500; }
.ws-task-status.done { background: var(--status-done-bg); color: var(--status-done-text); }
.ws-task-status.running { background: var(--status-processing-bg); color: var(--status-processing-text); }

/* Upgrade CTA */
.ws-upgrade-card {
  position: relative;
  padding: 14px 10px;
  background: linear-gradient(135deg, #2D1B69 0%, #1E1040 100%);
  border-radius: 12px;
  text-align: center;
  overflow: hidden;
  color: #fff;
  margin: 8px 2px;
  flex-shrink: 0;
}
.ws-upgrade-glow {
  position: absolute;
  top: -30px; left: 50%;
  transform: translateX(-50%);
  width: 100px; height: 100px;
  background: radial-gradient(circle, rgba(167,139,250,0.4) 0%, transparent 70%);
  pointer-events: none;
}
.ws-upgrade-icon { font-size: 28px; display: block; margin-bottom: 6px; position: relative; }
.ws-upgrade-card strong { font-size: 14px; display: block; margin-bottom: 4px; position: relative; }
.ws-upgrade-card p { font-size: 11px; opacity: 0.7; margin-bottom: 12px; position: relative; line-height: 1.5; }
.ws-upgrade-btn {
  width: 100%;
  padding: 9px 0;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,0.2);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast);
  position: relative;
}
.ws-upgrade-btn:hover { background: rgba(255,255,255,0.3); }

[data-theme="dark"] .ws-upgrade-card {
  background: linear-gradient(135deg, #1E1145 0%, #140C32 100%);
}

/* Sidebar Bottom */
.ws-side-bottom {
  border-top: 1px solid var(--border-light);
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

/* Sidebar Overlay */
.ws-sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0; top: var(--ws-header-height);
  background: var(--modal-overlay);
  z-index: 45;
}

/* ================================================
   MAIN CONTENT
   ================================================ */
.ws-main {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
  z-index: 1;
  background: var(--bg-page);
}
.ws-main-inner {
  max-width: 1024px;
  margin: 0 auto;
  padding: 32px 48px 80px;
}

.ws-main-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}
.ws-page-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.5px;
  line-height: 1.2;
}

/* Sidebar toggle button */
.ws-sidebar-toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 32px; height: 32px;
  padding: 7px 6px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--ws-card);
  cursor: pointer;
  flex-shrink: 0;
}
.ws-sidebar-toggle:hover { border-color: var(--brand); }
.toggle-bar { display: block; width: 100%; height: 2px; background: var(--text-secondary); border-radius: 2px; transition: all 0.25s; }
.toggle-bar.open:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.toggle-bar.open:nth-child(2) { opacity: 0; }
.toggle-bar.open:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

/* ================================================
   INPUT CARD — Hero element
   ================================================ */
.ws-input-card {
  background: var(--ws-card);
  border: 1px solid var(--border-light);
  border-radius: 20px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  overflow: hidden;
  transition: all 0.25s ease;
}
.ws-input-card:focus-within {
  border-color: var(--brand-alpha-20);
  box-shadow: 0 0 0 3px var(--brand-alpha-08);
}

.ws-input-body {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  padding: 24px 28px 22px;
}

.ws-upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 18px;
  border: 1.5px dashed var(--border-light);
  border-radius: 16px;
  background: var(--ws-sidebar-hover);
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  white-space: nowrap;
  min-width: 76px;
}
.ws-upload-btn:hover {
  border-color: var(--brand-alpha-30);
  color: var(--brand);
  background: var(--ws-accent-light);
  transform: translateY(-1px);
}

.ws-textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-primary);
  background: transparent;
  font-family: inherit;
  min-height: 96px;
  align-self: stretch;
}
.ws-textarea::placeholder { color: var(--text-muted); opacity: 0.4; }

.ws-submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  background: var(--brand-gradient);
  color: #fff;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 16px var(--brand-alpha-20);
  flex-shrink: 0;
  align-self: center;
}
.ws-submit-btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 8px 32px var(--brand-alpha-35);
}
.ws-submit-btn:active:not(:disabled) { transform: scale(0.94); }
.ws-submit-btn:disabled { opacity: 0.25; cursor: not-allowed; box-shadow: none; }

/* Intent Hint */
.ws-intent-hint {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 20px; border-top: 1px solid var(--border-light);
  font-size: 12px; color: var(--text-secondary);
  background: var(--ws-sidebar-hover);
}
.intent-icon { font-size: 14px; }
.intent-text strong { color: var(--brand); font-weight: 600; }
.intent-conf { padding: 1px 6px; background: var(--brand); color: #fff; border-radius: 8px; font-size: 10px; }
.intent-platform { padding: 1px 6px; background: var(--bg-secondary); color: var(--text-muted); border-radius: 8px; font-size: 10px; }

/* Parameter Row */
.ws-params-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 26px;
  border-top: 1px solid var(--border-light);
  flex-wrap: wrap;
}
.ws-param-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ws-param-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-right: 6px;
  flex-shrink: 0;
  font-weight: 500;
}
.ws-param-chip {
  padding: 6px 14px;
  border: 1px solid var(--border-light);
  border-radius: 100px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  font-weight: 500;
}
.ws-param-chip:hover { border-color: var(--brand-alpha-30); color: var(--brand); }
.ws-param-chip.active {
  background: var(--text-primary);
  color: #fff;
  border-color: var(--text-primary);
  font-weight: 600;
}
[data-theme="dark"] .ws-param-chip.active {
  background: #e5e7eb;
  color: #0a0a0a;
  border-color: #e5e7eb;
}
.ws-param-divider { width: 1px; height: 18px; background: var(--border-light); margin: 0 6px; }

/* ================================================
   QUICK TAGS
   ================================================ */
.ws-quick-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.ws-tags-label {
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.ws-tag-chip {
  padding: 5px 16px;
  border: 1px solid var(--border-light);
  border-radius: 20px;
  background: var(--ws-card);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.ws-tag-chip:hover { border-color: var(--brand); color: var(--brand); background: var(--ws-accent-light); }

/* ================================================
   QUICK FUNCTION CARDS
   ================================================ */
.ws-quick-cards-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 24px;
}
.ws-quick-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--ws-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 20px 24px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.ws-quick-card:hover {
  border-color: var(--brand-alpha-15);
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  transform: translateY(-1px);
}
.ws-qc-left { display: flex; align-items: center; gap: 14px; }
.ws-qc-icon { font-size: 28px; flex-shrink: 0; }
.ws-qc-content strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 3px;
}
.ws-qc-content p {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}
.ws-qc-arrow {
  color: var(--text-muted);
  flex-shrink: 0;
  transition: all var(--transition-base);
}
.ws-quick-card:hover .ws-qc-arrow { color: var(--brand); transform: translateX(3px); }

/* ================================================
   TOOL CARDS SECTION
   ================================================ */
.ws-cards-section { margin-top: 44px; }
.ws-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.ws-section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}
.ws-section-dot { width: 7px; height: 7px; background: var(--brand); border-radius: 50%; }
.ws-section-more {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.15s ease;
}
.ws-section-more:hover { color: var(--brand); }

.ws-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.ws-tool-card {
  position: relative;
  background: var(--ws-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 22px 20px 20px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.ws-tool-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  border-color: var(--border-light);
}
.ws-tool-card:active { transform: translateY(-2px) scale(0.98); }

.ws-card-badge {
  position: absolute;
  top: 12px; right: 12px;
  font-size: 10px;
  font-weight: 600;
  color: var(--brand);
  background: var(--ws-accent-light);
  padding: 3px 10px;
  border-radius: 100px;
  letter-spacing: 0.02em;
}
.ws-card-icon-wrap {
  width: 48px; height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  transition: transform 0.2s ease;
}
.ws-tool-card:hover .ws-card-icon-wrap { transform: scale(1.06); }
.ws-card-icon { font-size: 24px; }
.ws-card-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 5px; letter-spacing: -0.2px; }
.ws-card-desc { font-size: 12px; color: var(--text-muted); line-height: 1.6; }

/* ================================================
   RECENT WORKS
   ================================================ */
.ws-recent-section { margin-top: 44px; }
.ws-recent-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.ws-recent-card {
  background: var(--ws-card);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.ws-recent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  border-color: var(--border-light);
}
.ws-recent-preview {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: var(--bg-hover);
}
.ws-recent-placeholder {
  font-size: 42px;
  opacity: 0.4;
  transition: all 0.2s ease;
}
.ws-recent-card:hover .ws-recent-placeholder { transform: scale(1.1); opacity: 0.2; }
.ws-recent-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.ws-recent-card:hover .ws-recent-overlay { opacity: 1; }
.ws-recent-action {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand);
  background: #fff;
  padding: 7px 18px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.ws-recent-info { padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; }
.ws-recent-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.ws-recent-meta { font-size: 11px; color: var(--text-muted); }

/* ================================================
   RESPONSIVE
   ================================================ */
@media (max-width: 1400px) {
  .ws-cards-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 1200px) {
  .ws-recent-grid { grid-template-columns: repeat(3, 1fr); }
  .ws-main-inner { padding: 28px 32px 72px; }
}
@media (max-width: 1100px) {
  .ws-cards-grid { grid-template-columns: repeat(2, 1fr); }
  .ws-recent-grid { grid-template-columns: repeat(2, 1fr); }
  .ws-quick-cards-row { grid-template-columns: 1fr; }
}
@media (max-width: 900px) {
  .ws-header-uname { display: none; }
  .ws-header-tab-label { display: none; }
  .ws-header-tab { padding: 8px 14px; }
}
@media (max-width: 768px) {
  .ws-sidebar-toggle { display: flex; }
  .ws-sidebar {
    position: fixed;
    left: 0; top: var(--ws-header-height); bottom: 0;
    z-index: 50;
    box-shadow: var(--shadow-dropdown);
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .ws-sidebar.open { transform: translateX(0); }
  .ws-sidebar-overlay { display: block; }
  .ws-header-tabs { gap: 2px; }
  .ws-header-tab { padding: 8px 12px; font-size: 12px; }
  .ws-header-inner { padding: 0 16px; gap: 12px; }
  .ws-main-inner { padding: 20px 16px 64px; }
  .ws-page-title { font-size: 22px; }
  .ws-header-hamburger { display: flex; }
  .ws-header-uname { display: none; }
}
@media (max-width: 480px) {
  .ws-cards-grid { grid-template-columns: 1fr; }
  .ws-recent-grid { grid-template-columns: 1fr; }
  .ws-header-tab { padding: 8px 10px; font-size: 11px; }
  .ws-header-tab-icon { font-size: 12px; }
  .ws-header-brand { font-size: 15px; }
  .ws-input-body { flex-direction: column; padding: 14px 16px; }
  .ws-upload-btn { flex-direction: row; gap: 6px; padding: 10px 16px; min-width: auto; width: 100%; justify-content: center; }
  .ws-submit-btn { width: 100%; border-radius: 10px; }
  .ws-params-row { justify-content: center; }
  .ws-param-group { flex-wrap: wrap; justify-content: center; }
  .ws-header-inner { padding: 0 8px; gap: 6px; }
}
</style>