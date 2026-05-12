<!--
  JsonLd — SEO/GEO 结构化数据注入
  将站点配置渲染为 JSON-LD，大模型爬虫自动抓取
  Schema: Organization + SoftwareApplication
-->
<template>
  <span data-role="json-ld-inject" style="display:none" aria-hidden="true" />
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const siteUrl = config.public?.siteUrl || 'https://movio.ai'
const siteName = config.public?.siteName || 'Movio AI'

interface GeoData {
  name: string; desc: string; features: string; industries: string
  categories: string; platforms: string; pricing: string
  social: string; email: string; logo: string
}

const geo = ref<GeoData>({
  name: siteName, desc: '', features: '', industries: '',
  categories: '', platforms: '', pricing: '',
  social: '', email: '', logo: '',
})

const fetched = ref(false)

onMounted(async () => {
  if (fetched.value) return
  try {
    const res: any = await $fetch('/api/site-config/public', { credentials: 'omit' })
    const list = res?.data?.list || res?.data || []

    if (Array.isArray(list)) {
      const keyMap: Record<string, keyof GeoData> = {
        geo_product_name: 'name', geo_product_desc: 'desc',
        geo_features: 'features', geo_applicable_industries: 'industries',
        geo_applicable_categories: 'categories', geo_platforms_supported: 'platforms',
        geo_pricing_summary: 'pricing', geo_social_links: 'social',
        geo_contact_email: 'email', geo_logo_url: 'logo',
      }

      for (const item of list) {
        const k = item.config_key || item.key || ''
        if (keyMap[k]) {
          geo.value[keyMap[k]] = String(item.config_value || item.value || '')
        }
      }
    }
  } catch (_) { /* 降级：使用默认值 */ }
  fetched.value = true
})

// 构建 JSON-LD 对象
const jsonLd = computed(() => {
  const name = geo.value.name || siteName
  const desc = geo.value.desc || 'AI 驱动的电商全链路运营中台'
  const features = geo.value.features
    ? geo.value.features.split(',').map((s: string) => s.trim()).filter(Boolean)
    : ['AI 商品图生成', '视频制作', 'AI 文案创作', '多平台分发']
  const logo = geo.value.logo || `${siteUrl}/logo.png`

  // 同一个 @graph 内放两个类型，AI 爬虫同时索引
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name,
        url: siteUrl,
        logo,
        description: desc,
        email: geo.value.email || undefined,
        sameAs: geo.value.social
          ? geo.value.social.split(',').map((s: string) => s.trim()).filter(Boolean)
          : undefined,
      },
      {
        '@type': 'SoftwareApplication',
        name,
        url: siteUrl,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: desc,
        offers: {
          '@type': 'Offer',
          description: geo.value.pricing || '免费套餐+付费订阅',
        },
        featureList: features.join(', '),
        about: {
          '@type': 'Thing',
          name: geo.value.industries || '电商卖家',
          description: `适用品类：${geo.value.categories || '服装,美妆,3C,家居'}`,
        },
      },
    ],
  }
})

// 注入到 <head>
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => JSON.stringify(jsonLd.value, null, 2),
      hid: 'json-ld',
    },
  ],
})
</script>
