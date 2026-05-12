<template>
  <footer class="lp-foot">
    <div class="lp-foot-in">
      <div class="lp-foot-brand">
        <span class="lp-foot-logo">M</span>
        <span class="lp-foot-name">{{ siteName }}</span>
        <p>{{ $t('landing.footer_desc') }}</p>
      </div>
      <div class="lp-foot-lk">
        <div><h4>{{ $t('landing.footer_products') }}</h4><a href="#features">{{ $t('landing.footer_features') }}</a><a href="#pricing">{{ $t('landing.footer_pricing') }}</a><a href="#how">{{ $t('landing.footer_how') }}</a></div>
        <div><h4>{{ $t('landing.footer_support') }}</h4><a href="#faq">{{ $t('landing.footer_faq') }}</a><NuxtLink to="/help">{{ $t('landing.footer_help') }}</NuxtLink><NuxtLink to="/help">{{ $t('landing.footer_contact') }}</NuxtLink></div>
        <div><h4>{{ $t('landing.footer_legal') }}</h4><NuxtLink to="/legal/privacy">{{ $t('landing.footer_privacy') }}</NuxtLink><NuxtLink to="/legal/terms">{{ $t('landing.footer_terms') }}</NuxtLink></div>
      </div>
    </div>
    <div class="lp-foot-bot"><span>{{ $t('landing.footer_copyright', { year: currentYear }) }}</span></div>
  </footer>
</template>

<script setup>
defineProps({
  siteName: { type: String, required: true },
  currentYear: { type: Number, required: true },
});
</script>
