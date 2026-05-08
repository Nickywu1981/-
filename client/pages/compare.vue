<template>
  <div class="compare-page">
    <div class="compare-hero">
      <h2>Movio AI vs 传统工具</h2>
      <p>全维度对比，看看 Movio AI 能为你省多少时间和成本</p>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-value">10x</span>
        <span class="stat-label">效率提升</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">80%</span>
        <span class="stat-label">成本节省</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">13+</span>
        <span class="stat-label">平台覆盖</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">0</span>
        <span class="stat-label">学习门槛</span>
      </div>
    </div>

    <div class="table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th>对比维度</th>
            <th class="col-us">
              <span class="th-badge">Movio AI</span>
            </th>
            <th class="col-them">
              <span class="th-badge secondary">传统方式</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.label">
            <td class="label-cell">
              <span class="dim-icon">{{ row.icon }}</span>
              {{ row.label }}
            </td>
            <td class="us-cell">
              <span class="check">✓</span>
              {{ row.us }}
            </td>
            <td class="them-cell">
              <span class="cross">✗</span>
              {{ row.them }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="cta-section">
      <h3>开始免费使用 Movio AI</h3>
      <p>每天 20 点算力免费体验全部功能</p>
      <NuxtLink to="/register" class="cta-btn">免费注册 →</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const rows = [
  { icon: '🖼️', label: '图片处理', us: '抠图/主图/场景/详情页全流程AI自动化', them: 'Photoshop/美图秀秀，需手动操作' },
  { icon: '🎬', label: '视频生成', us: '图片→带货视频，自动字幕/BGM/特效', them: 'Premiere/剪映，需手动剪辑' },
  { icon: '📱', label: '平台适配', us: '13平台一键尺寸适配（淘宝/抖音/亚马逊等）', them: '需手动调整每个平台尺寸' },
  { icon: '⚡', label: '批量处理', us: '拖文件夹→AI批量处理→ZIP下载', them: '逐张处理，耗时长' },
  { icon: '👗', label: 'AI虚拟模特', us: '服装上身虚拟模特，多肤色/体型可选', them: '需实拍模特，成本高周期长' },
  { icon: '🏃', label: '动作迁移', us: '人物图+动作视频→AI精准动作迁移', them: '需专业视频拍摄团队' },
  { icon: '🎙️', label: '数字人口播', us: '输入文案→选形象+语音→AI生成口播视频', them: '需真人出镜录制' },
  { icon: '✍️', label: '智能脚本', us: 'AI自动生成带货/种草/直播脚本', them: '需人工撰写' },
  { icon: '🎯', label: '分镜生成', us: '输入产品→AI生成专业拍摄分镜方案', them: '需导演/摄影师编排' },
  { icon: '🔥', label: '爆款分析', us: '分析爆款视频结构→套用你的产品', them: '需人工分析模仿' },
  { icon: '🌙', label: '夜间托管', us: '夜间自动批量处理，6折优惠', them: '不支持' },
  { icon: '📋', label: '模板复用', us: '保存参数为模板，一键复刻', them: '每次需重新设置' },
  { icon: '💰', label: '价格成本', us: '月卡¥29起，按需灵活付费', them: 'Adobe ¥248/月 + 外包费用' },
  { icon: '📚', label: '学习成本', us: '自然语言输入，零学习门槛', them: '需专业软件学习，成本高' },
]
</script>

<style scoped>
.compare-page { max-width: 1000px; margin: 0 auto; padding: 32px 16px 60px; }
.compare-hero { text-align: center; margin-bottom: 32px; }
.compare-hero h2 { font-size: 26px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.compare-hero p { font-size: 14px; color: var(--text-secondary); }

.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 36px; }
.stat-card { padding: 20px 12px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-xl); text-align: center; transition: all var(--transition-fast); }
.stat-card:hover { border-color: var(--brand); transform: translateY(-2px); box-shadow: 0 8px 24px var(--brand-alpha); }
.stat-value { display: block; font-size: 28px; font-weight: 800; background: var(--brand-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 4px; }
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
.cta-btn { display: inline-block; padding: 12px 32px; background: #fff; color: var(--brand); border-radius: var(--radius-lg); font-size: 15px; font-weight: 700; text-decoration: none; transition: all var(--transition-fast); }
.cta-btn:hover { transform: scale(1.04); box-shadow: 0 6px 20px rgba(0,0,0,.2); }

@media (max-width: 640px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .stat-value { font-size: 22px; }
}
</style>
