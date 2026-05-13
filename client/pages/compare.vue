<template>
  <div class="compare-page">
    <div class="compare-hero">
      <h2>{{ $t('competitive.hero_title') }}</h2>
      <p>{{ $t('competitive.hero_subtitle') }}</p>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-value">10x</span>
        <span class="stat-label">{{ $t('competitive.stats.efficiency') }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">80%</span>
        <span class="stat-label">{{ $t('competitive.stats.cost_saving') }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">13+</span>
        <span class="stat-label">{{ $t('competitive.stats.platform_coverage') }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">0</span>
        <span class="stat-label">{{ $t('competitive.stats.learning_barrier') }}</span>
      </div>
    </div>

    <div class="table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th>{{ $t('competitive.table.dimension') }}</th>
            <th class="col-us">
              <span class="th-badge">{{ $t('competitive.table.us') }}</span>
            </th>
            <th class="col-them">
              <span class="th-badge secondary">{{ $t('competitive.table.them') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key">
            <td class="label-cell">
              <span class="dim-icon">{{ row.icon }}</span>
              {{ $t(row.labelKey) }}
            </td>
            <td class="us-cell">
              <span class="check">✓</span>
              {{ $t(row.usKey) }}
            </td>
            <td class="them-cell">
              <span class="cross">✗</span>
              {{ $t(row.themKey) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="cta-section">
      <h3>{{ $t('competitive.cta.title') }}</h3>
      <p>{{ $t('competitive.cta.subtitle') }}</p>
      <NuxtLink to="/register" class="cta-btn">{{ $t('competitive.cta.button') }}</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const rows = [
  { key: 'image_processing',  icon: '🖼️', labelKey: 'competitive.rows.image_processing.label',  usKey: 'competitive.rows.image_processing.us',  themKey: 'competitive.rows.image_processing.them' },
  { key: 'video_generation',  icon: '🎬', labelKey: 'competitive.rows.video_generation.label',  usKey: 'competitive.rows.video_generation.us',  themKey: 'competitive.rows.video_generation.them' },
  { key: 'platform_adaptation', icon: '📱', labelKey: 'competitive.rows.platform_adaptation.label', usKey: 'competitive.rows.platform_adaptation.us', themKey: 'competitive.rows.platform_adaptation.them' },
  { key: 'batch_processing',  icon: '⚡', labelKey: 'competitive.rows.batch_processing.label',  usKey: 'competitive.rows.batch_processing.us',  themKey: 'competitive.rows.batch_processing.them' },
  { key: 'ai_model',       icon: '👗', labelKey: 'competitive.rows.ai_model.label',       usKey: 'competitive.rows.ai_model.us',       themKey: 'competitive.rows.ai_model.them' },
  { key: 'motion_transfer', icon: '🏃', labelKey: 'competitive.rows.motion_transfer.label',  usKey: 'competitive.rows.motion_transfer.us',  themKey: 'competitive.rows.motion_transfer.them' },
  { key: 'digital_avatar',  icon: '🎙️', labelKey: 'competitive.rows.digital_avatar.label',  usKey: 'competitive.rows.digital_avatar.us',  themKey: 'competitive.rows.digital_avatar.them' },
  { key: 'smart_script',    icon: '✍️', labelKey: 'competitive.rows.smart_script.label',    usKey: 'competitive.rows.smart_script.us',    themKey: 'competitive.rows.smart_script.them' },
  { key: 'storyboard',    icon: '🎯', labelKey: 'competitive.rows.storyboard.label',      usKey: 'competitive.rows.storyboard.us',      themKey: 'competitive.rows.storyboard.them' },
  { key: 'trend_analysis',  icon: '🔥', labelKey: 'competitive.rows.trend_analysis.label',  usKey: 'competitive.rows.trend_analysis.us',  themKey: 'competitive.rows.trend_analysis.them' },
  { key: 'night_batch',    icon: '🌙', labelKey: 'competitive.rows.night_batch.label',      usKey: 'competitive.rows.night_batch.us',      themKey: 'competitive.rows.night_batch.them' },
  { key: 'template_reuse',  icon: '📋', labelKey: 'competitive.rows.template_reuse.label',  usKey: 'competitive.rows.template_reuse.us',  themKey: 'competitive.rows.template_reuse.them' },
  { key: 'pricing',       icon: '💰', labelKey: 'competitive.rows.pricing.label',         usKey: 'competitive.rows.pricing.us',         themKey: 'competitive.rows.pricing.them' },
  { key: 'learning_curve',  icon: '📚', labelKey: 'competitive.rows.learning_curve.label',  usKey: 'competitive.rows.learning_curve.us',  themKey: 'competitive.rows.learning_curve.them' },
]

definePageMeta({ layout: 'landing' })
</script>

<style scoped>
.compare-page { max-width: 1000px; margin: 0 auto; padding: 32px 16px 60px; }
.compare-hero { text-align: center; margin-bottom: 32px; }
.compare-hero h2 { font-size: 26px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.compare-hero p { font-size: 14px; color: var(--text-secondary); }

.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 36px; }
.stat-card { padding: 20px 12px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-xl); text-align: center; transition: border-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast); }
.stat-card:hover { border-color: var(--brand); transform: translateY(-2px); box-shadow: 0 8px 24px var(--brand-alpha); }
.stat-value { display: block; font-size: 28px; font-weight: 800; background: var(--brand-gradient); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 4px; }
.stat-label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }

.table-wrap { overflow-x: auto; border-radius: var(--radius-xl); border: 1px solid var(--border-light); }
.compare-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.compare-table th { padding: 14px 16px; background: var(--bg-footer); text-align: left; font-size: 13px; font-weight: 600; color: var(--text-secondary); border-bottom: 2px solid var(--border-light); }
.compare-table th:first-child { border-radius: var(--radius-xl) 0 0 0; }
.compare-table th:last-child { border-radius: 0 var(--radius-xl) 0 0; }
.th-badge { padding: 4px 14px; border-radius: 12px; font-size: 12px; }
.col-us .th-badge { background: var(--brand-gradient); color: #fff; }
.col-them .th-badge.secondary { background: var(--bg-secondary); color: var(--text-secondary); }

.compare-table td { padding: 13px 16px; border-bottom: 1px solid var(--border-light); }
.label-cell { font-weight: 600; color: var(--text-primary); white-space: nowrap; }
.dim-icon { margin-right: 6px; font-size: 15px; }
.us-cell { color: var(--brand); font-weight: 500; }
.them-cell { color: var(--text-muted); }
.check { color: var(--success); font-weight: 700; font-size: 14px; margin-right: 4px; }
.cross { color: var(--danger); font-weight: 700; margin-right: 4px; }

.compare-table tr:hover td { background: var(--bg-hover); }
.compare-table tr:last-child td { border-bottom: none; }

.cta-section { text-align: center; margin-top: 48px; padding: 40px 20px; background: var(--brand-gradient); border-radius: var(--radius-xl); color: #fff; }
.cta-section h3 { font-size: 22px; font-weight: 700; margin: 0 0 8px; }
.cta-section p { font-size: 14px; margin: 0 0 20px; opacity: 0.9; }
.cta-btn { display: inline-block; padding: 12px 32px; background: var(--bg-card); color: var(--brand); border-radius: var(--radius-lg); font-size: 15px; font-weight: 700; text-decoration: none; transition: transform var(--transition-fast), box-shadow var(--transition-fast); }
.cta-btn:hover { transform: scale(1.04); box-shadow: 0 6px 20px rgba(0,0,0,.2); }

@media (max-width: 640px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .stat-value { font-size: 22px; }
}
</style>
