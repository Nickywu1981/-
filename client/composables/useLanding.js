/**
 * useLanding — 首页共享逻辑 composable
 *
 * 从 index.vue(935行) 提取, 减少页面文件体积
 */
export async function useLanding() {
  const { t, locale } = useI18n();
  const route = useRoute();

  // ── Auth ──
  const user = ref(null);
  async function checkAuth() {
    try { const res = await $fetch('/api/user/profile', { credentials: 'include' }); user.value = res.data; } catch { user.value = null; }
  }

  // ── Site config ──
  const { data: siteConfig } = await useAsyncData('site-config-home', () =>
    $fetch('/api/site-config/public').catch((err) => { if (import.meta.dev) console.warn('[home] site config load failed, using defaults', err?.message || err); return {}; })
  );

  const siteName = computed(() => siteConfig.value?.site_name || 'Movio AI');
  const heroTitle = computed(() => siteConfig.value?.hero_title || t('landing.hero_title_highlight'));
  const heroSubtitle = computed(() => siteConfig.value?.hero_subtitle || t('landing.hero_subtitle_fallback'));
  const heroCta = computed(() => siteConfig.value?.hero_cta || t('landing.hero_cta'));
  const apiPricing = computed(() => {
    if (Array.isArray(siteConfig.value?.pricing) && siteConfig.value.pricing.length) return siteConfig.value.pricing;
    return null;
  });

  // ── Scroll ──
  const scrolled = ref(false);
  const showBackTop = ref(false);
  const activeSection = ref('');
  const mobileOpen = ref(false);

  function scrollTo(id) {
    if (!process.client) return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function scrollToTop() {
    if (!process.client) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  let scrollTicking = false;
  let rafId = null;
  const handleScroll = () => {
    if (!scrollTicking) {
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY;
        scrolled.value = y > 50;
        showBackTop.value = y > 600;
        const sections = ['features', 'how', 'pricing', 'faq'];
        let found = false;
        for (let i = sections.length - 1; i >= 0; i--) {
          const el = document.getElementById(sections[i]);
          if (el && el.getBoundingClientRect().top <= 120) {
            activeSection.value = sections[i];
            found = true;
            break;
          }
        }
        if (!found) activeSection.value = '';
        scrollTicking = false;
        rafId = null;
      });
      scrollTicking = true;
    }
  };

  // ── Entrance animation ──
  const animatedEls = ref(new Set());
  let entranceObserver = null;

  function setupEntranceObserver() {
    if (process.client && window.IntersectionObserver) {
      entranceObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !animatedEls.value.has(entry.target)) {
            animatedEls.value.add(entry.target);
            entry.target.classList.add('lp-in');
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });
      document.querySelectorAll('.lp-card, .lp-mf-card, .lp-step, .lp-case, .lp-plan, .lp-faq-it').forEach(el => entranceObserver.observe(el));
      setTimeout(() => {
        document.querySelectorAll('.lp-card, .lp-mf-card, .lp-step, .lp-case, .lp-plan, .lp-faq-it').forEach(el => {
          if (!animatedEls.value.has(el)) { el.classList.add('lp-in'); }
        });
      }, 2000);
    }
  }

  function destroyEntranceObserver() {
    if (entranceObserver) entranceObserver.disconnect();
  }

  onUnmounted(() => { if (rafId) cancelAnimationFrame(rafId); destroyEntranceObserver(); scrollTicking = false; })

  // ── FAQ ──
  const faqOpen = ref(-1);
  function toggleFaq(i) { faqOpen.value = faqOpen.value === i ? -1 : i; }

  // ── Tabs ──
  const activeTab = ref('all');

  // ── Computed i18n data ──
  const tabs = computed(() => [
    { key: 'all', label: t('landing.features_tab_all'), icon: '✦' },
    { key: 'image', label: t('landing.features_tab_image'), icon: '▦' },
    { key: 'video', label: t('landing.features_tab_video'), icon: '▶' },
    { key: 'ai', label: t('landing.features_tab_ai'), icon: '◆' },
  ]);

  const memfocusCards = computed(() => t('landing.memfocus_cards'));
  const steps = computed(() => t('landing.steps'));
  const useCases = computed(() => t('landing.use_cases'));
  const faqs = computed(() => t('landing.faqs'));
  const platforms = computed(() => t('landing.platforms'));
  const cards = computed(() => {
    const fromI18n = t('landing.feature_cards');
    if (Array.isArray(fromI18n) && fromI18n.length) return fromI18n;
    return [];
  });

  const filteredCards = computed(() =>
    activeTab.value === 'all' ? cards.value : cards.value.filter((c) => c.category === activeTab.value)
  );

  function countForTab(key) {
    if (key === 'all') return cards.value.length;
    return cards.value.filter((c) => c.category === key).length;
  }

  const plans = computed(() => {
    const raw = t('landing.plans');
    if (Array.isArray(raw) && raw.length) return raw;
    const fallback = t('landing.plans_fallback');
    return Array.isArray(fallback) && fallback.length ? fallback : [];
  });

  const displayPlans = computed(() => apiPricing.value || plans.value);

  return {
    user, checkAuth,
    siteConfig, siteName, heroTitle, heroSubtitle, heroCta, apiPricing,
    scrolled, showBackTop, activeSection, mobileOpen,
    scrollTo, scrollToTop, handleScroll,
    setupEntranceObserver, destroyEntranceObserver,
    faqOpen, toggleFaq,
    activeTab,
    tabs, memfocusCards, steps, useCases, faqs, platforms, cards,
    filteredCards, countForTab, displayPlans,
  };
}
