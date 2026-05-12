<template>
  <div class="lp">
    <!-- Skip to content (accessibility) -->
    <a href="#main-content" class="lp-skip">{{ $t('landing.skip_to_content') }}</a>

    <!-- ===== NAV ===== -->
    <header class="lp-nav" :class="{ on: scrolled }">
      <div class="lp-nav-in">
        <NuxtLink to="/" class="lp-nav-brand" :aria-label="siteName + ' ' + $t('landing.home_label')">
          <span class="lp-nav-mark">M</span>
          <span class="lp-nav-name">{{ siteName }}</span>
        </NuxtLink>
        <nav class="lp-nav-lk" role="navigation" :aria-label="$t('landing.nav_label')">
          <a href="#features" :class="{ on: activeSection === 'features' }" @click.prevent="scrollTo('features')">{{ $t('landing.nav_features') }}</a>
          <a href="#how" :class="{ on: activeSection === 'how' }" @click.prevent="scrollTo('how')">{{ $t('landing.nav_how') }}</a>
          <a href="#pricing" :class="{ on: activeSection === 'pricing' }" @click.prevent="scrollTo('pricing')">{{ $t('landing.nav_pricing') }}</a>
          <a href="#faq" :class="{ on: activeSection === 'faq' }" @click.prevent="scrollTo('faq')">{{ $t('landing.nav_faq') }}</a>
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
          <button class="lp-ham" @click="mobileOpen = !mobileOpen" :aria-label="mobileOpen ? $t('landing.menu_close') : $t('landing.menu_open')">
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
    <section id="main-content" class="lp-hero" tabindex="-1">
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
          <div><b>{{ $t('landing.hero_metrics.images_num') }}</b><span>{{ $t('landing.hero_metrics.images') }}</span></div>
          <i />
          <div><b>{{ $t('landing.hero_metrics.merchants_num') }}</b><span>{{ $t('landing.hero_metrics.merchants') }}</span></div>
          <i />
          <div><b>{{ $t('landing.hero_metrics.satisfaction_num') }}</b><span>{{ $t('landing.hero_metrics.satisfaction') }}</span></div>
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
              <div class="lp-mock-tabs"><span class="on">{{ $t('landing.mockup_tab_main') }}</span><span>{{ $t('landing.mockup_tab_scene') }}</span><span>{{ $t('landing.mockup_tab_video') }}</span></div>
              <div class="lp-mock-up"><span>+</span></div>
              <div class="lp-mock-grid">
                <div v-for="i in 3" :key="i"><div /><span>{{ $t('landing.mockup_generate') }} {{ i }}</span></div>
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
            <div class="lp-mob-card-tabs"><span class="on">{{ $t('landing.mockup_tab_main') }}</span><span>{{ $t('landing.mockup_scene_short') }}</span><span>{{ $t('landing.mockup_video_short') }}</span></div>
            <div class="lp-mob-card-up">+ {{ $t('landing.mockup_upload') }}</div>
            <div class="lp-mob-card-grid"><div v-for="i in 3" :key="i"><div /></div></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== MemFocus AI — 百万年薪秘书 ===== -->
    <section class="lp-memfocus">
      <div class="lp-sec-hd">
        <span class="lp-sec-tag">{{ $t('landing.memfocus_tag') }}</span>
        <h2>{{ $t('landing.memfocus_title') }}</h2>
        <p>{{ $t('landing.memfocus_desc') }}</p>
      </div>
      <div class="lp-mf-grid">
        <div class="lp-mf-card" v-for="(c, i) in memfocusCards" :key="i">
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
        <span>"</span>{{ $t('landing.memfocus_quote') }}<span>"</span>
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
          {{ tab.label }} <span class="lp-tab-count">{{ getTabCount(tab.key) }}</span>
        </button>
      </div>
      <div class="lp-feat-grid" role="list">
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
        <p>{{ $t('landing.how_subtitle') }}</p>
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
        <span class="lp-sec-tag">{{ $t('landing.cases_tag') }}</span>
        <h2>{{ $t('landing.cases_title') }}</h2>
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
        <p>{{ $t('landing.pricing_subtitle') }}</p>
      </div>
      <div class="lp-price-grid">
        <div class="lp-plan" v-for="plan in displayPlans" :key="plan.name" :class="{ pop: plan.featured }">
          <div v-if="plan.featured" class="lp-plan-badge">{{ $t('landing.plan_popular') }}</div>
          <div class="lp-plan-ico">{{ plan.icon }}</div>
          <h3>{{ plan.name }}</h3>
          <div class="lp-plan-pr"><b>{{ $t('landing.currency_symbol') }}{{ plan.price }}</b><span>{{ $t('landing.pricing_period') }}</span></div>
          <ul class="lp-plan-feat"><li v-for="f in plan.features" :key="f">{{ f }}</li></ul>
          <button class="lp-plan-btn" :class="{ on: plan.featured }">{{ plan.featured ? $t('landing.plan_subscribe') : $t('landing.plan_start') }}</button>
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
        <div v-for="(q, i) in faqs" :key="i" class="lp-faq-it" :class="{ on: faqOpen === i }" @click="faqOpen = faqOpen === i ? -1 : i" @keydown.enter.prevent="faqOpen = faqOpen === i ? -1 : i" @keydown.space.prevent="faqOpen = faqOpen === i ? -1 : i" role="button" :aria-expanded="faqOpen === i" tabindex="0">
          <div class="lp-faq-q"><span>{{ q.q }}</span><span class="lp-faq-arw">{{ faqOpen === i ? '−' : '+' }}</span></div>
          <div class="lp-faq-a"><p>{{ q.a }}</p></div>
        </div>
      </div>
    </section>

    <!-- ===== CTA ===== -->
    <section class="lp-cta">
      <div class="lp-cta-card">
        <div class="lp-cta-glow" />
        <h2>{{ $t('landing.cta_title') }}</h2>
        <p>{{ $t('landing.cta_desc') }}</p>
        <div class="lp-cta-btns">
          <NuxtLink to="/register" class="lp-hero-cta">{{ $t('landing.cta_button') }} <span>&rarr;</span></NuxtLink>
          <NuxtLink to="/help" class="lp-cta-link">{{ $t('landing.cta_link') }}</NuxtLink>
        </div>
      </div>
    </section>

    <LandingFooter :siteName="siteName" :currentYear="currentYear" />

    <!-- Back to top -->
    <button v-show="showBackTop" class="lp-back-top" @click="scrollToTop" :aria-label="$t('landing.back_top')" :title="$t('landing.back_top')">↑</button>
  </div>
</template>

<script setup lang="ts">
import { useLanding } from '~/composables/useLanding';

definePageMeta({ layout: 'landing' });

const { locale, t } = useI18n();

useHead(() => ({
  htmlAttrs: { lang: locale.value === 'en' ? 'en' : 'zh-CN' },
  title: locale.value === 'en' ? 'Movio AI — Full-Stack Ops Assistant' : 'Movio AI — 全链路运营助手',
  meta: [
    { name: 'description', content: locale.value === 'en' ? 'Movio AI — Full-stack e-commerce AI automation. Upload product photos, generate main images, scene images, detail pages, and video content in one click.' : 'Movio AI — 全链路运营助手，电商AI内容中台。上传产品照片即可生成主图、场景图、详情页、带货视频，一个人就是一支视觉团队' },
    { name: 'keywords', content: locale.value === 'en' ? 'AI e-commerce images,product image maker,AI scene generator,video creation' : 'AI电商图,电商主图制作,AI场景图,详情页生成,电商视频制作,AI抠图,商品图批量处理,淘宝主图,拼多多主图,抖音商品图,小红书封面' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { property: 'og:title', content: locale.value === 'en' ? 'Movio AI — Full-Stack Ops Assistant' : 'Movio AI — 全链路运营助手' },
    { property: 'og:description', content: locale.value === 'en' ? 'From photos to videos — one-click AI creation for 13 e-commerce platforms' : '覆盖13个电商平台，从图片到视频一站式AI创作' },
    { property: 'og:type', content: 'website' },
  ],
}));

const {
  user, checkAuth,
  siteName, heroTitle, heroSubtitle, heroCta, apiPricing,
  scrolled, showBackTop, activeSection, mobileOpen,
  scrollTo, scrollToTop, handleScroll,
  setupEntranceObserver, destroyEntranceObserver,
  faqOpen, toggleFaq,
  activeTab,
  tabs, memfocusCards, steps, useCases, faqs, platforms, cards,
  filteredCards, countForTab: getTabCount, displayPlans,
} = useLanding();

const currentYear = new Date().getFullYear();

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
  checkAuth();
  setupEntranceObserver();
});
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  destroyEntranceObserver();
});

</script>


<style scoped>
/* ============ SKIP LINK ============ */
.lp-skip { position: absolute; top: -100px; left: 16px; z-index: 200; padding: 10px 20px; background: var(--lp-brand); color: var(--lp-card-bg); border-radius: 8px; font-size: 14px; font-weight: 500; text-decoration: none; }
.lp-skip:focus { top: 8px; }

/* ============ ROOT ============ */
.lp {
  /* Landing page design tokens */
  --lp-bg: #fafaf9;
  --lp-text: #171717;
  --lp-text-secondary: #6b6b70;
  --lp-text-muted: #b0b0b5;
  --lp-text-tertiary: #8e8e93;
  --lp-card-bg: #fff;
  --lp-border: #ebebea;
  --lp-border-hover: #d9d9d7;
  --lp-border-strong: #c5c5c2;
  --lp-bg-subtle: #f5f5f4;
  --lp-bg-muted: #f0efed;
  --lp-brand: #5b5fe3;
  --lp-brand-light: rgba(91,95,227,0.08);
  --lp-brand-glow: rgba(91,95,227,0.06);
  --lp-brand-shadow: rgba(91,95,227,0.12);
  --lp-brand-20: rgba(91,95,227,0.2);
  --lp-brand-22: rgba(91,95,227,0.22);
  --lp-brand-28: rgba(91,95,227,0.28);
  --lp-gold: #c8a87c;
  --lp-nav-bg: rgba(250,250,249,0.85);
  --lp-btn-hover: #2d2d2d;
  --lp-green: #2d9b6e;
  --lp-purple-light: #a78bfa;
  --lp-gray-dot: #d1d1cf;
  --lp-bg-warm: #f5f4f1;
  --lp-border-quote: #e5e5e2;
  --lp-gold-glow: rgba(200,168,124,0.12);
  --lp-overlay-02: rgba(0,0,0,0.02);
  --lp-overlay-04: rgba(0,0,0,0.04);
  --lp-overlay-03: rgba(0,0,0,0.03);
  --lp-shadow-sm: rgba(0,0,0,0.05);
  --lp-shadow-md: rgba(0,0,0,0.07);
  --lp-shadow-lg: rgba(0,0,0,0.12);
  --lp-shadow-xl: rgba(0,0,0,0.2);
  --lp-shine: rgba(255,255,255,0.15);
  --lp-shine-bright: rgba(255,255,255,0.25);
  --lp-shadow-xs: rgba(0,0,0,0.06);
  --lp-shadow-card: rgba(0,0,0,0.08);

  background: var(--lp-bg); color: var(--lp-text); overflow-x: hidden; font-feature-settings: 'cv02','cv03','cv04','cv11'; }

/* ============ NAV ============ */
.lp-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  padding: 0 clamp(12px, 3vw, 24px); height: 56px;
  display: flex; align-items: center;
  background: transparent; transition: background 0.3s cubic-bezier(0.22, 1, 0.36, 1), backdrop-filter 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.lp-nav.on { background: var(--lp-nav-bg); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid var(--lp-border); }
.lp-nav-in { width: 100%; max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 40px; }
.lp-nav-brand { display: flex; align-items: center; gap: 8px; text-decoration: none; flex-shrink: 0; }
.lp-nav-mark { width: 28px; height: 28px; background: var(--lp-brand); color: var(--lp-card-bg); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; letter-spacing: -0.5px; }
.lp-nav-name { font-size: 15px; font-weight: 500; color: var(--lp-text); letter-spacing: -0.02em; }
.lp-nav-lk { display: flex; gap: 32px; flex: 1; justify-content: center; }
.lp-nav-lk a { font-size: 14px; color: var(--lp-text-secondary); text-decoration: none; transition: color 0.2s; letter-spacing: -0.01em; }
.lp-nav-lk a:hover { color: var(--lp-text); }
.lp-nav-lk a.on { color: var(--lp-brand); }
.lp-nav-lk a:focus-visible { outline: 2px solid var(--lp-brand); outline-offset: 4px; border-radius: 2px; }
.lp-nav-act { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.lp-btn-main {
  display: inline-flex; align-items: center; padding: 8px 18px;
  background: var(--lp-text); color: var(--lp-bg); border: none; border-radius: 8px;
  font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none;
  transition: background 0.2s, transform 0.2s; letter-spacing: -0.01em;
}
.lp-btn-main:hover { background: var(--lp-btn-hover); transform: translateY(-1px); }
.lp-btn-ghost {
  display: inline-flex; align-items: center; padding: 8px 18px;
  background: transparent; color: var(--lp-text); border: 1px solid var(--lp-border); border-radius: 8px;
  font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none;
  transition: border-color 0.2s, background 0.2s; letter-spacing: -0.01em;
}
.lp-btn-ghost:hover { border-color: var(--lp-border-strong); background: var(--lp-overlay-02); }

.lp-ham { display: none; width: 36px; height: 36px; border: none; background: transparent; flex-direction: column; align-items: center; justify-content: center; gap: 5px; cursor: pointer; border-radius: 8px; }
.lp-ham:focus-visible { outline: 2px solid var(--lp-brand); outline-offset: 2px; }
.lp-ham span { display: block; width: 18px; height: 1.5px; background: var(--lp-text); border-radius: 1px; transition: transform 0.25s, opacity 0.25s; }
.lp-ham span.on:first-child { transform: translateY(6.5px) rotate(45deg); }
.lp-ham span.on:nth-child(2) { opacity: 0; }
.lp-ham span.on:last-child { transform: translateY(-6.5px) rotate(-45deg); }

.lp-mob { position: fixed; top: 56px; left: 0; right: 0; background: var(--lp-bg); border-bottom: 1px solid var(--lp-border); padding: 16px 20px; display: flex; flex-direction: column; gap: 2px; z-index: 99; }
.lp-mob a { display: block; padding: 12px 16px; font-size: 15px; color: var(--lp-text); text-decoration: none; border-radius: 8px; transition: background 0.15s; }
.lp-mob a:hover { background: var(--lp-overlay-04); }
.lp-mob-cta { display: block; margin-top: 8px; padding: 12px 16px; background: var(--lp-text); color: var(--lp-bg) !important; border-radius: 8px; text-align: center; font-weight: 500 !important; }

/* ============ HERO ============ */
.lp-hero { position: relative; padding: 120px clamp(16px, 4vw, 40px) 80px; display: flex; flex-direction: column; align-items: center; text-align: center; overflow: hidden; }
.lp-hero-bg { position: absolute; inset: 0; background: radial-gradient(ellipse 60% 50% at 50% 0%, var(--lp-overlay-03), transparent 70%); pointer-events: none; }
.lp-hero-body { position: relative; z-index: 2; max-width: 720px; }
.lp-hero-tag { display: inline-flex; align-items: center; gap: 8px; padding: 5px 14px; background: var(--lp-overlay-04); border-radius: 999px; font-size: 12px; color: var(--lp-text-secondary); margin-bottom: 24px; letter-spacing: -0.01em; }
.lp-hero-tag i { width: 6px; height: 6px; border-radius: 50%; background: var(--lp-green); }
.lp-hero-h1 { font-size: clamp(32px, 6vw, 56px); font-weight: 500; line-height: 1.12; letter-spacing: -0.04em; color: var(--lp-text); margin: 0 0 20px; }
.lp-hero-h1 em { font-style: normal; background: linear-gradient(135deg, var(--lp-brand), var(--lp-purple-light)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.lp-hero-p { font-size: 17px; line-height: 1.65; color: var(--lp-text-secondary); margin: 0 0 32px; max-width: 560px; margin-left: auto; margin-right: auto; }
.lp-hero-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 40px; }
.lp-hero-cta {
  display: inline-flex; align-items: center; gap: 6px; padding: 12px 28px;
  background: var(--lp-text); color: var(--lp-bg); border: none; border-radius: 10px;
  font-size: 15px; font-weight: 500; cursor: pointer; text-decoration: none;
  transition: background 0.25s, transform 0.25s, box-shadow 0.25s; letter-spacing: -0.02em;
}
.lp-hero-cta:hover { background: var(--lp-btn-hover); transform: translateY(-2px); box-shadow: 0 8px 24px var(--lp-shadow-lg); }
.lp-hero-cta:focus-visible { outline: 2px solid var(--lp-brand); outline-offset: 2px; }
.lp-hero-cta span { transition: transform 0.2s; }
.lp-hero-cta:hover span { transform: translateX(3px); }
.lp-hero-demo {
  display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px;
  background: transparent; color: var(--lp-text); border: 1px solid var(--lp-border); border-radius: 10px;
  font-size: 14px; font-weight: 500; cursor: pointer; text-decoration: none;
  transition: border-color 0.2s, background 0.2s;
}
.lp-hero-demo:hover { border-color: var(--lp-border-strong); background: var(--lp-overlay-02); }
.lp-hero-demo:focus-visible { outline: 2px solid var(--lp-brand); outline-offset: 2px; }
.lp-hero-play { font-size: 10px; }
.lp-hero-nums { display: flex; align-items: center; gap: 24px; justify-content: center; flex-wrap: wrap; }
.lp-hero-nums div { text-align: center; }
.lp-hero-nums b { display: block; font-size: 28px; font-weight: 500; letter-spacing: -0.03em; color: var(--lp-text); }
.lp-hero-nums span { font-size: 12px; color: var(--lp-text-secondary); }
.lp-hero-nums i { width: 1px; height: 32px; background: var(--lp-border); display: block; }

/* Hero Mockup */
.lp-hero-mock { position: relative; margin-top: 48px; z-index: 1; }
.lp-hero-mob { display: none; margin-top: 40px; }
.lp-mock {
  width: clamp(320px, 70vw, 860px); background: var(--lp-card-bg); border-radius: 12px;
  border: 1px solid var(--lp-border); box-shadow: 0 4px 32px var(--lp-shadow-xs); overflow: hidden;
}
.lp-mock-bar { display: flex; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--lp-bg-subtle); }
.lp-mock-bar span { width: 10px; height: 10px; border-radius: 50%; background: var(--lp-border); }
.lp-mock-bar span:first-child { background: var(--lp-gray-dot); }
.lp-mock-bar span:last-child { background: var(--lp-gray-dot); }
.lp-mock-in { display: flex; height: 340px; }
.lp-mock-side { width: 48px; border-right: 1px solid var(--lp-bg-subtle); display: flex; flex-direction: column; align-items: center; padding: 12px 0; gap: 10px; }
.lp-mock-side span { width: 20px; height: 20px; border-radius: 5px; background: var(--lp-bg-subtle); }
.lp-mock-side span.on { background: var(--lp-brand); }
.lp-mock-main { flex: 1; padding: 16px 20px; }
.lp-mock-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.lp-mock-tabs span { padding: 5px 14px; border-radius: 7px; font-size: 12px; color: var(--lp-text-secondary); background: var(--lp-bg-subtle); }
.lp-mock-tabs span.on { background: var(--lp-brand); color: var(--lp-card-bg); }
.lp-mock-up { height: 120px; border: 1.5px dashed var(--lp-border); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--lp-text-muted); font-size: 28px; font-weight: 300; margin-bottom: 14px; }
.lp-mock-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.lp-mock-grid div { background: var(--lp-bg); border-radius: 8px; height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--lp-bg-subtle); }
.lp-mock-grid div div { width: 70%; height: 40px; background: var(--lp-bg-muted); border: none; border-radius: 4px; }
.lp-mock-grid div span { font-size: 10px; color: var(--lp-text-muted); }
.lp-mock-glow { position: absolute; top: -40px; left: 50%; transform: translateX(-50%); width: 600px; height: 200px; background: radial-gradient(ellipse, var(--lp-brand-light), transparent 70%); pointer-events: none; z-index: -1; }

/* Mockup shine animation */
.lp-mock { position: relative; overflow: hidden; }
.lp-mock::after {
  content: ''; position: absolute; top: -60%; left: -100%; width: 60%; height: 220%;
  background: linear-gradient(105deg, transparent 30%, var(--lp-shine) 45%, var(--lp-shine-bright) 50%, var(--lp-shine) 55%, transparent 70%);
  animation: lp-shine 4s ease-in-out infinite; z-index: 2; pointer-events: none;
}
@keyframes lp-shine {
  0% { left: -100%; }
  40%, 100% { left: 120%; }
}

/* Mobile Mockup */
.lp-mob-card { width: 260px; background: var(--lp-card-bg); border-radius: 16px; border: 1px solid var(--lp-border); box-shadow: 0 4px 24px var(--lp-shadow-xs); overflow: hidden; margin: 0 auto; }
.lp-mob-card-bar { display: flex; gap: 6px; padding: 10px 12px; border-bottom: 1px solid var(--lp-bg-subtle); }
.lp-mob-card-bar span { width: 7px; height: 7px; border-radius: 50%; background: var(--lp-border); }
.lp-mob-card-body { padding: 14px 12px; }
.lp-mob-card-tabs { display: flex; gap: 6px; margin-bottom: 12px; }
.lp-mob-card-tabs span { padding: 4px 10px; border-radius: 6px; font-size: 11px; color: var(--lp-text-secondary); background: var(--lp-bg-subtle); }
.lp-mob-card-tabs span.on { background: var(--lp-brand); color: var(--lp-card-bg); }
.lp-mob-card-up { height: 56px; border: 1.5px dashed var(--lp-border); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--lp-text-muted); font-size: 12px; margin-bottom: 10px; }
.lp-mob-card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.lp-mob-card-grid div { height: 60px; background: var(--lp-bg); border-radius: 6px; border: 1px solid var(--lp-bg-subtle); }
.lp-mob-card-grid div div { width: 60%; height: 24px; background: var(--lp-bg-muted); margin: 10px auto 0; border: none; border-radius: 3px; }

/* ============ MemFocus AI ============ */
.lp-memfocus { padding: 80px clamp(16px, 4vw, 40px); background: linear-gradient(180deg, var(--lp-bg) 0%, var(--lp-bg-warm) 50%, var(--lp-bg) 100%); border-top: 1px solid var(--lp-border); }
.lp-mf-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 1200px; margin: 0 auto 40px; }
.lp-mf-card {
  background: var(--lp-card-bg); border: 1px solid var(--lp-border); border-radius: 14px; padding: 22px 18px 18px;
  display: flex; flex-direction: column; gap: 8px; transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s cubic-bezier(0.22, 1, 0.36, 1); position: relative; overflow: hidden;
}
.lp-mf-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; opacity: 0; transition: opacity 0.3s; }
.lp-mf-card:nth-child(1)::before { background: linear-gradient(90deg, var(--lp-brand), #7c7ff0); }
.lp-mf-card:nth-child(2)::before { background: linear-gradient(90deg, #4f5bd5, #6e72e0); }
.lp-mf-card:nth-child(3)::before { background: linear-gradient(90deg, #a093c7, #b5aad4); }
.lp-mf-card:nth-child(4)::before { background: linear-gradient(90deg, #6b7db3, #8795c4); }
.lp-mf-card:nth-child(5)::before { background: linear-gradient(90deg, #c4847b, #d49d95); }
.lp-mf-card:nth-child(6)::before { background: linear-gradient(90deg, #7ba587, #95b89f); }
.lp-mf-card:nth-child(7)::before { background: linear-gradient(90deg, #c49a6c, #d4af86); }
.lp-mf-card:nth-child(8)::before { background: linear-gradient(90deg, var(--lp-gold), #d4ba95); }
.lp-mf-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px var(--lp-shadow-card); border-color: var(--lp-border-hover); }
.lp-mf-card:hover::before { opacity: 1; }
.lp-mf-card:focus-visible { outline: 2px solid var(--lp-brand); outline-offset: 2px; }
.lp-mf-badge { font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--lp-text-muted); }
.lp-mf-title { font-size: 18px; font-weight: 500; color: var(--lp-text); letter-spacing: -0.02em; line-height: 1.2; }
.lp-mf-sub { font-size: 12px; color: var(--lp-text-tertiary); margin-top: -4px; }
.lp-mf-divider { height: 1px; background: var(--lp-bg-muted); margin: 2px 0; }
.lp-mf-api { font-size: 12px; font-weight: 600; color: var(--lp-brand); background: var(--lp-brand-glow); padding: 6px 10px; border-radius: 7px; text-align: center; letter-spacing: -0.01em; }
.lp-mf-story { font-size: 12px; line-height: 1.6; color: var(--lp-text-secondary); font-style: italic; border-left: 2px solid var(--lp-border-quote); padding-left: 10px; }
.lp-mf-metric { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid var(--lp-bg-subtle); margin-top: auto; font-size: 11px; color: var(--lp-text-tertiary); }
.lp-mf-metric b { font-size: 13px; font-weight: 600; color: var(--lp-gold); }
.lp-mf-quote { max-width: 600px; margin: 0 auto; text-align: center; font-size: 15px; font-weight: 500; color: var(--lp-text); letter-spacing: -0.01em; line-height: 1.6; }
.lp-mf-quote span { color: var(--lp-gold); font-size: 20px; }
@media (max-width: 1100px) { .lp-mf-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .lp-mf-grid { grid-template-columns: 1fr; } .lp-mf-card { padding: 18px 14px 14px; } }

/* ============ PLATFORMS ============ */
.lp-plat { padding: 32px clamp(16px, 4vw, 40px); text-align: center; border-bottom: 1px solid var(--lp-border); }
.lp-plat p { font-size: 12px; color: var(--lp-text-secondary); margin: 0 0 12px; letter-spacing: 0.04em; text-transform: uppercase; }
.lp-plat-row { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; }
.lp-plat-row span { font-size: 14px; color: var(--lp-text-secondary); }

/* ============ SECTION HEADER ============ */
.lp-sec-hd { text-align: center; margin-bottom: 48px; }
.lp-sec-tag { font-size: 11px; color: var(--lp-text-secondary); letter-spacing: 0.06em; text-transform: uppercase; display: block; margin-bottom: 12px; }
.lp-sec-hd h2 { font-size: clamp(24px, 4vw, 36px); font-weight: 500; letter-spacing: -0.03em; color: var(--lp-text); margin: 0 0 12px; }
.lp-sec-hd p { font-size: 15px; color: var(--lp-text-secondary); max-width: 480px; margin: 0 auto; line-height: 1.6; }

/* Anchor scroll offset for fixed nav */
#features, #how, #pricing, #faq { scroll-margin-top: 72px; }

/* ============ FEATURES ============ */
.lp-feat { padding: 80px clamp(16px, 4vw, 40px); }
.lp-feat-tabs { display: flex; gap: 4px; justify-content: center; margin-bottom: 40px; background: var(--lp-overlay-04); border-radius: 10px; padding: 4px; width: fit-content; margin-left: auto; margin-right: auto; }
.lp-feat-tabs button {
  padding: 7px 20px; border: none; background: transparent; border-radius: 7px;
  font-size: 13px; color: var(--lp-text-secondary); cursor: pointer; transition: background 0.2s, color 0.2s, box-shadow 0.2s; font-weight: 500;
}
.lp-feat-tabs button.on { background: var(--lp-card-bg); color: var(--lp-brand); box-shadow: 0 1px 4px var(--lp-brand-shadow); }
.lp-tab-count { font-size: 10px; color: var(--lp-text-muted); margin-left: 3px; font-weight: 400; }
.lp-feat-tabs button.on .lp-tab-count { color: var(--lp-brand); opacity: 0.7; }
.lp-feat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; max-width: 1200px; margin: 0 auto; }

.lp-card {
  background: var(--lp-card-bg); border: 1px solid var(--lp-border); border-radius: 12px; padding: 24px;
  cursor: pointer; transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  position: relative; overflow: hidden;
}
.lp-card::after {
  content: ''; position: absolute; inset: 0; border-radius: 12px;
  background: radial-gradient(ellipse at 50% 0%, var(--lp-brand-glow), transparent 60%);
  opacity: 0; transition: opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1); pointer-events: none; z-index: 0;
}
.lp-card:hover::after { opacity: 1; }
.lp-card > * { position: relative; z-index: 1; }
.lp-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px var(--lp-shadow-md); border-color: var(--lp-border-hover); }
.lp-card:focus-visible { outline: 2px solid var(--lp-brand); outline-offset: 2px; }
.lp-card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
.lp-card-ico { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.lp-card-ai {
  font-size: 10px; font-weight: 600; letter-spacing: 0.04em; color: var(--lp-brand);
  background: var(--lp-brand-light); padding: 3px 8px; border-radius: 5px;
}
.lp-card h3 { font-size: 15px; font-weight: 500; color: var(--lp-text); margin: 0 0 6px; letter-spacing: -0.01em; }
.lp-card p { font-size: 13px; color: var(--lp-text-secondary); line-height: 1.55; margin: 0 0 14px; }
.lp-card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.lp-card-tags span { font-size: 11px; color: var(--lp-text-tertiary); background: var(--lp-overlay-04); padding: 3px 8px; border-radius: 5px; }

/* ============ HOW ============ */
.lp-how { padding: 80px clamp(16px, 4vw, 40px); background: var(--lp-card-bg); border-top: 1px solid var(--lp-border); border-bottom: 1px solid var(--lp-border); }
.lp-how-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 960px; margin: 0 auto; }
.lp-step { text-align: center; padding: 32px 20px; }
.lp-step-num { width: 32px; height: 32px; border-radius: 50%; background: var(--lp-brand); color: var(--lp-card-bg); display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; margin-bottom: 16px; }
.lp-step-ico { font-size: 32px; margin-bottom: 14px; }
.lp-step h3 { font-size: 16px; font-weight: 500; color: var(--lp-text); margin: 0 0 8px; letter-spacing: -0.01em; }
.lp-step p { font-size: 13px; color: var(--lp-text-secondary); line-height: 1.55; margin: 0; }

/* ============ USE CASES ============ */
.lp-cases { padding: 80px clamp(16px, 4vw, 40px); }
.lp-cases-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; max-width: 1000px; margin: 0 auto; }
.lp-case { background: var(--lp-card-bg); border: 1px solid var(--lp-border); border-radius: 12px; padding: 28px; }
.lp-case-av { width: 44px; height: 44px; border-radius: 50%; background: var(--lp-bg-subtle); display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 16px; }
.lp-case h3 { font-size: 15px; font-weight: 500; color: var(--lp-text); margin: 0 0 4px; }
.lp-case-role { font-size: 12px; color: var(--lp-text-muted); margin: 0 0 14px; }
.lp-case ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.lp-case li { font-size: 13px; color: var(--lp-text-secondary); padding-left: 16px; position: relative; }
.lp-case li::before { content: ''; position: absolute; left: 0; top: 7px; width: 5px; height: 5px; border-radius: 50%; background: var(--lp-gold); }

/* ============ PRICING ============ */
.lp-price { padding: 80px clamp(16px, 4vw, 40px); background: var(--lp-card-bg); border-top: 1px solid var(--lp-border); }
.lp-price-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; max-width: 960px; margin: 0 auto; }
.lp-plan { background: var(--lp-bg); border: 1px solid var(--lp-border); border-radius: 12px; padding: 32px 24px; text-align: center; position: relative; transition: transform 0.3s, box-shadow 0.3s; }
.lp-plan:hover { transform: translateY(-2px); box-shadow: 0 8px 24px var(--lp-shadow-sm); }
.lp-plan:focus-visible { outline: 2px solid var(--lp-brand); outline-offset: 2px; }
.lp-plan.pop { background: var(--lp-text); border-color: var(--lp-text); transform: scale(1.03); box-shadow: 0 8px 48px var(--lp-brand-22); }
.lp-plan.pop:hover { transform: scale(1.03) translateY(-2px); box-shadow: 0 12px 56px var(--lp-brand-28); }
.lp-plan-badge { position: absolute; top: -11px; left: 50%; transform: translateX(-50%); background: var(--lp-gold); color: var(--lp-card-bg); font-size: 11px; font-weight: 500; padding: 4px 14px; border-radius: 999px; white-space: nowrap; }
.lp-plan-ico { font-size: 28px; margin-bottom: 12px; }
.lp-plan h3 { font-size: 16px; font-weight: 500; color: var(--lp-text); margin: 0 0 12px; }
.lp-plan.pop h3 { color: var(--lp-bg); }
.lp-plan-pr { margin-bottom: 20px; }
.lp-plan-pr b { font-size: 36px; font-weight: 500; color: var(--lp-text); letter-spacing: -0.03em; }
.lp-plan.pop .lp-plan-pr b { color: var(--lp-bg); }
.lp-plan-pr span { font-size: 13px; color: var(--lp-text-secondary); }
.lp-plan.pop .lp-plan-pr span { color: var(--lp-text-muted); }
.lp-plan-feat { list-style: none; padding: 0; margin: 0 0 24px; display: flex; flex-direction: column; gap: 10px; }
.lp-plan-feat li { font-size: 13px; color: var(--lp-text-secondary); }
.lp-plan.pop .lp-plan-feat li { color: var(--lp-border-hover); }
.lp-plan-btn {
  width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--lp-border);
  background: var(--lp-card-bg); color: var(--lp-text); font-size: 14px; font-weight: 500; cursor: pointer;
  transition: border-color 0.2s;
}
.lp-plan-btn.on { background: var(--lp-bg); color: var(--lp-text); border-color: var(--lp-border-hover); font-weight: 500; }
.lp-plan-btn:hover { border-color: var(--lp-border-strong); }
.lp-plan-btn.on:hover { background: var(--lp-bg-muted); }
.lp-plan.pop .lp-plan-btn { background: var(--lp-bg); color: var(--lp-text); border: none; }
.lp-plan.pop .lp-plan-btn:hover { background: var(--lp-border); }

/* ============ FAQ ============ */
.lp-faq { padding: 80px clamp(16px, 4vw, 40px); }
.lp-faq-list { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; }
.lp-faq-it { border: 1px solid var(--lp-border); border-radius: 10px; overflow: hidden; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
.lp-faq-it:hover { border-color: var(--lp-border-hover); }
.lp-faq-it.on { border-color: var(--lp-border-strong); background: var(--lp-card-bg); }
.lp-faq-it:focus-visible { outline: 2px solid var(--lp-brand); outline-offset: -2px; border-radius: 10px; }
.lp-faq-q { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; font-size: 14px; font-weight: 500; color: var(--lp-text); }
.lp-faq-arw { font-size: 18px; color: var(--lp-text-secondary); font-weight: 400; transition: transform 0.3s, color 0.3s; }
.lp-faq-it.on .lp-faq-arw { color: var(--lp-brand); }
.lp-faq-a { max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.35s ease; }
.lp-faq-it.on .lp-faq-a { max-height: 200px; padding: 0 20px 16px; }
.lp-faq-a p { font-size: 13px; color: var(--lp-text-secondary); line-height: 1.6; margin: 0; padding-top: 8px; border-top: 1px solid var(--lp-bg-muted); }

/* ============ CTA ============ */
.lp-cta { padding: 80px clamp(16px, 4vw, 40px); }
.lp-cta-card {
  position: relative; max-width: 680px; margin: 0 auto; padding: 56px 32px;
  background: var(--lp-text); border-radius: 16px; text-align: center; overflow: hidden;
}
.lp-cta-glow { position: absolute; top: -80px; right: -80px; width: 300px; height: 300px; background: radial-gradient(circle, var(--lp-brand-20), transparent 60%); pointer-events: none; }
.lp-cta-glow::after { content: ''; position: absolute; bottom: -40px; left: -40px; width: 180px; height: 180px; background: radial-gradient(circle, var(--lp-gold-glow), transparent 60%); pointer-events: none; }
.lp-cta h2 { font-size: clamp(22px, 3.5vw, 30px); font-weight: 500; color: var(--lp-bg); margin: 0 0 12px; letter-spacing: -0.03em; position: relative; }
.lp-cta p { font-size: 15px; color: var(--lp-text-muted); margin: 0 0 28px; position: relative; }
.lp-cta-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; position: relative; }
.lp-cta-link { font-size: 14px; color: var(--lp-text-muted); text-decoration: none; padding: 12px 20px; transition: color 0.2s; }
.lp-cta-link:hover { color: var(--lp-bg); }
.lp-cta-card .lp-hero-cta { background: var(--lp-bg); color: var(--lp-brand); }
.lp-cta-card .lp-hero-cta:hover { background: var(--lp-card-bg); transform: translateY(-2px); box-shadow: 0 8px 24px var(--lp-shadow-xl); }

/* ============ FOOTER ============ */
.lp-foot { padding: 48px clamp(16px, 4vw, 40px) 24px; border-top: 1px solid var(--lp-border); }
.lp-foot-in { max-width: 960px; margin: 0 auto; display: flex; gap: 80px; flex-wrap: wrap; justify-content: space-between; margin-bottom: 32px; }
.lp-foot-brand { max-width: 240px; }
.lp-foot-logo { width: 28px; height: 28px; background: var(--lp-brand); color: var(--lp-card-bg); border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; margin-bottom: 12px; }
.lp-foot-name { font-size: 15px; font-weight: 500; color: var(--lp-text); display: block; margin-bottom: 8px; }
.lp-foot-brand p { font-size: 13px; color: var(--lp-text-secondary); margin: 0; line-height: 1.5; }
.lp-foot-lk { display: flex; gap: 64px; }
.lp-foot-lk h4 { font-size: 12px; font-weight: 500; color: var(--lp-text); margin: 0 0 12px; letter-spacing: 0.03em; }
.lp-foot-lk a { display: block; font-size: 13px; color: var(--lp-text-secondary); text-decoration: none; margin-bottom: 8px; transition: color 0.15s; }
.lp-foot-lk a:hover { color: var(--lp-text); }
.lp-foot-bot { max-width: 960px; margin: 0 auto; padding-top: 20px; border-top: 1px solid var(--lp-bg-muted); text-align: center; }
.lp-foot-bot span { font-size: 12px; color: var(--lp-text-muted); }

/* ============ BACK TO TOP ============ */
.lp-back-top {
  position: fixed; bottom: 32px; right: 32px; z-index: 90;
  width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--lp-border);
  background: var(--lp-card-bg); color: var(--lp-text-secondary); font-size: 18px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 12px var(--lp-shadow-xs); transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.lp-back-top:hover { background: var(--lp-brand); color: var(--lp-card-bg); border-color: var(--lp-brand); transform: translateY(-2px); box-shadow: 0 4px 16px var(--lp-brand-20); }
.lp-back-top:focus-visible { outline: 2px solid var(--lp-brand); outline-offset: 2px; }

/* ============ TRANSITIONS ============ */
.sd-enter-active, .sd-leave-active { transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
.sd-enter-from, .sd-leave-to { opacity: 0; transform: translateY(-8px); }

/* ============ ENTRANCE ANIMATIONS ============ */
/* Cards start invisible, become visible after JS hydrates */
.lp-card, .lp-mf-card, .lp-step, .lp-case, .lp-plan, .lp-faq-it {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1), transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}
/* SSR/noscript fallback: reveal immediately */
@media (scripting: none) {
  .lp-card, .lp-mf-card, .lp-step, .lp-case, .lp-plan, .lp-faq-it { opacity: 1; transform: none; }
}
.lp-card.lp-in, .lp-mf-card.lp-in, .lp-step.lp-in, .lp-case.lp-in, .lp-plan.lp-in, .lp-faq-it.lp-in {
  opacity: 1;
  transform: translateY(0);
}
/* Stagger delays for grid children */
.lp-mf-card:nth-child(1) { transition-delay: 0s; }
.lp-mf-card:nth-child(2) { transition-delay: 0.06s; }
.lp-mf-card:nth-child(3) { transition-delay: 0.12s; }
.lp-mf-card:nth-child(4) { transition-delay: 0.18s; }
.lp-mf-card:nth-child(5) { transition-delay: 0.24s; }
.lp-mf-card:nth-child(6) { transition-delay: 0.30s; }
.lp-mf-card:nth-child(7) { transition-delay: 0.36s; }
.lp-mf-card:nth-child(8) { transition-delay: 0.42s; }

/* Feature card grid stagger (up to 12 visible at a time) */
.lp-feat-grid .lp-card:nth-child(1) { transition-delay: 0s; }
.lp-feat-grid .lp-card:nth-child(2) { transition-delay: 0.04s; }
.lp-feat-grid .lp-card:nth-child(3) { transition-delay: 0.08s; }
.lp-feat-grid .lp-card:nth-child(4) { transition-delay: 0.12s; }
.lp-feat-grid .lp-card:nth-child(5) { transition-delay: 0.16s; }
.lp-feat-grid .lp-card:nth-child(6) { transition-delay: 0.20s; }
.lp-feat-grid .lp-card:nth-child(7) { transition-delay: 0.24s; }
.lp-feat-grid .lp-card:nth-child(8) { transition-delay: 0.28s; }
.lp-feat-grid .lp-card:nth-child(9) { transition-delay: 0.32s; }
.lp-feat-grid .lp-card:nth-child(10) { transition-delay: 0.36s; }
.lp-feat-grid .lp-card:nth-child(11) { transition-delay: 0.40s; }
.lp-feat-grid .lp-card:nth-child(12) { transition-delay: 0.44s; }

/* Use case stagger */
.lp-case:nth-child(1) { transition-delay: 0s; }
.lp-case:nth-child(2) { transition-delay: 0.08s; }
.lp-case:nth-child(3) { transition-delay: 0.16s; }

/* Pricing plan stagger */
.lp-plan:nth-child(1) { transition-delay: 0s; }
.lp-plan:nth-child(2) { transition-delay: 0.08s; }
.lp-plan:nth-child(3) { transition-delay: 0.16s; }

/* Hero gradient subtle shimmer */
.lp-hero-h1 em {
  background-size: 200% 200%;
  animation: lp-gradient-shift 6s ease-in-out infinite alternate;
}
@keyframes lp-gradient-shift {
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}

/* CTA glow pulse */
.lp-cta-glow {
  animation: lp-cta-pulse 4s ease-in-out infinite alternate;
}
@keyframes lp-cta-pulse {
  0% { opacity: 0.6; transform: scale(1); }
  100% { opacity: 1; transform: scale(1.05); }
}

/* Skip-link focus animation */
.lp-skip:focus {
  animation: lp-skip-in 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes lp-skip-in {
  from { top: -40px; }
  to { top: 8px; }
}

/* ============ DARK MODE ============ */
:root[data-theme="dark"] .lp, :root.dark .lp {
  --lp-bg: #121212;
  --lp-text: #e5e5e5;
  --lp-text-secondary: #9d9da3;
  --lp-text-muted: #6b6b70;
  --lp-text-tertiary: #7a7a80;
  --lp-card-bg: #1a1a1a;
  --lp-border: #2a2a2a;
  --lp-border-hover: #3a3a3a;
  --lp-border-strong: #4a4a4a;
  --lp-bg-subtle: #1a1a1a;
  --lp-bg-muted: #1e1e1e;
  --lp-bg-warm: #1a1a1a;
  --lp-nav-bg: rgba(18,18,18,0.85);
  --lp-border-quote: #3a3a3a;
  --lp-gray-dot: #4a4a4a;
  --lp-overlay-02: rgba(255,255,255,0.02);
  --lp-overlay-04: rgba(255,255,255,0.04);
  --lp-overlay-03: rgba(255,255,255,0.03);
  --lp-shadow-sm: rgba(0,0,0,0.3);
  --lp-shadow-md: rgba(0,0,0,0.4);
  --lp-shadow-lg: rgba(0,0,0,0.5);
  --lp-shadow-xl: rgba(0,0,0,0.6);
  --lp-shadow-xs: rgba(0,0,0,0.3);
  --lp-shadow-card: rgba(0,0,0,0.4);
  --lp-shine: rgba(255,255,255,0.05);
  --lp-shine-bright: rgba(255,255,255,0.08);
}

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
