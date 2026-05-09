<!--
  Movio AI v5.0 — 工作台首页
  三大固定类目总览：创作(全额) | AI助手(预留) | 工作流(预留)
-->
<template>
  <div class="ws-home">
    <!-- 页面标题 -->
    <div class="ws-hero">
      <h1 class="ws-hero-title">Movio AI 工作台</h1>
      <p class="ws-hero-sub">电商全店内容创作中心 — 图片 · 视频 · 数字人 · 配音 · 文案 · 营销素材</p>
    </div>

    <!-- ==================== 一、创作类 ==================== -->
    <section class="ws-category ws-category-primary">
      <div class="ws-cat-header">
        <h2 class="ws-cat-title">📷 创作类</h2>
        <span class="ws-cat-badge active">全力开发中</span>
      </div>
      <p class="ws-cat-desc">电商全店图片、视频、数字人、配音、文案、营销素材一站式内容创作。所有模块内置提示词润色。</p>

      <!-- 1. 图片工具 -->
      <div class="ws-sub-group">
        <h3 class="ws-sub-title">🖼 图片工具 <span class="ws-tag">含提示词润色</span></h3>
        <div class="ws-card-grid">
          <div v-for="card in imageCards" :key="card.path" class="ws-card" @click="navigateTo(card.path)">
            <span class="ws-card-icon">{{ card.icon }}</span>
            <div class="ws-card-body">
              <h4 class="ws-card-name">{{ card.name }}</h4>
              <p class="ws-card-use">场景: {{ card.scene }}</p>
              <p class="ws-card-solve">解决: {{ card.solve }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 视频工具 -->
      <div class="ws-sub-group">
        <h3 class="ws-sub-title">🎬 视频工具 <span class="ws-tag">含提示词润色</span></h3>
        <div class="ws-card-grid">
          <div v-for="card in videoCards" :key="card.path" class="ws-card" @click="navigateTo(card.path)">
            <span class="ws-card-icon">{{ card.icon }}</span>
            <div class="ws-card-body">
              <h4 class="ws-card-name">{{ card.name }}</h4>
              <p class="ws-card-use">场景: {{ card.scene }}</p>
              <p class="ws-card-solve">解决: {{ card.solve }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. AI换脸/数字人 -->
      <div class="ws-sub-group">
        <h3 class="ws-sub-title">🧑 AI 换脸 / 数字人</h3>
        <div class="ws-card-grid">
          <div v-for="card in faceCards" :key="card.path" class="ws-card" @click="navigateTo(card.path)">
            <span class="ws-card-icon">{{ card.icon }}</span>
            <div class="ws-card-body">
              <h4 class="ws-card-name">{{ card.name }}</h4>
              <p class="ws-card-use">场景: {{ card.scene }}</p>
              <p class="ws-card-solve">解决: {{ card.solve }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. 声音工具 -->
      <div class="ws-sub-group">
        <h3 class="ws-sub-title">🔊 声音工具</h3>
        <div class="ws-card-grid">
          <div v-for="card in voiceCards" :key="card.path" class="ws-card" @click="navigateTo(card.path)">
            <span class="ws-card-icon">{{ card.icon }}</span>
            <div class="ws-card-body">
              <h4 class="ws-card-name">{{ card.name }}</h4>
              <p class="ws-card-use">场景: {{ card.scene }}</p>
              <p class="ws-card-solve">解决: {{ card.solve }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. 文案工具 -->
      <div class="ws-sub-group">
        <h3 class="ws-sub-title">📝 文案工具 <span class="ws-tag">含提示词润色</span></h3>
        <div class="ws-card-grid">
          <div v-for="card in copyCards" :key="card.path" class="ws-card" @click="navigateTo(card.path)">
            <span class="ws-card-icon">{{ card.icon }}</span>
            <div class="ws-card-body">
              <h4 class="ws-card-name">{{ card.name }}</h4>
              <p class="ws-card-use">场景: {{ card.scene }}</p>
              <p class="ws-card-solve">解决: {{ card.solve }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 6. 平台适配 -->
      <div class="ws-sub-group">
        <h3 class="ws-sub-title">📐 平台适配</h3>
        <div class="ws-card-grid">
          <div v-for="card in platformCards" :key="card.path" class="ws-card" @click="navigateTo(card.path)">
            <span class="ws-card-icon">{{ card.icon }}</span>
            <div class="ws-card-body">
              <h4 class="ws-card-name">{{ card.name }}</h4>
              <p class="ws-card-use">场景: {{ card.scene }}</p>
              <p class="ws-card-solve">解决: {{ card.solve }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 7. 社媒/营销内容工具 -->
      <div class="ws-sub-group">
        <h3 class="ws-sub-title">📱 社媒 / 营销内容工具</h3>
        <div class="ws-card-grid">
          <div v-for="card in socialCards" :key="card.path" class="ws-card" @click="navigateTo(card.path)">
            <span class="ws-card-icon">{{ card.icon }}</span>
            <div class="ws-card-body">
              <h4 class="ws-card-name">{{ card.name }}</h4>
              <p class="ws-card-use">场景: {{ card.scene }}</p>
              <p class="ws-card-solve">解决: {{ card.solve }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 8. 效率工具 -->
      <div class="ws-sub-group">
        <h3 class="ws-sub-title">⚡ 效率工具</h3>
        <div class="ws-card-grid">
          <div v-for="card in efficiencyCards" :key="card.path" class="ws-card" @click="navigateTo(card.path)">
            <span class="ws-card-icon">{{ card.icon }}</span>
            <div class="ws-card-body">
              <h4 class="ws-card-name">{{ card.name }}</h4>
              <p class="ws-card-use">场景: {{ card.scene }}</p>
              <p class="ws-card-solve">解决: {{ card.solve }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 9. 生态/分发 -->
      <div class="ws-sub-group">
        <h3 class="ws-sub-title">🌍 生态 / 分发</h3>
        <div class="ws-card-grid">
          <div v-for="card in ecoCards" :key="card.path" class="ws-card" @click="navigateTo(card.path)">
            <span class="ws-card-icon">{{ card.icon }}</span>
            <div class="ws-card-body">
              <h4 class="ws-card-name">{{ card.name }}</h4>
              <p class="ws-card-use">场景: {{ card.scene }}</p>
              <p class="ws-card-solve">解决: {{ card.solve }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== 二、AI 助手类（预留） ==================== -->
    <section class="ws-category ws-category-placeholder">
      <div class="ws-cat-header">
        <h2 class="ws-cat-title">🤖 AI 助手类</h2>
        <span class="ws-cat-badge coming">即将上线</span>
      </div>
      <p class="ws-cat-desc">电商各类角色智能体，后期替代人工做售前售后、店铺巡检、商品优化、选品、竞品分析、自动管评价、合规避雷、数据复盘、直播值守，全岗位 AI 化。</p>
      <div class="ws-placeholder-grid">
        <div v-for="agent in aiAgents" :key="agent.name" class="ws-ph-card">
          <span class="ws-ph-icon">{{ agent.icon }}</span>
          <span class="ws-ph-name">{{ agent.name }}</span>
        </div>
      </div>
    </section>

    <!-- ==================== 三、工作流类（预留） ==================== -->
    <section class="ws-category ws-category-placeholder">
      <div class="ws-cat-header">
        <h2 class="ws-cat-title">⚙ 工作流类</h2>
        <span class="ws-cat-badge coming">即将上线</span>
      </div>
      <p class="ws-cat-desc">把零散功能串成标准化自动化流程。后期一键完成上新、做内容、发视频、管评价、做复盘，全程自动化。</p>
      <div class="ws-placeholder-grid">
        <div v-for="wf in workflows" :key="wf.name" class="ws-ph-card">
          <span class="ws-ph-icon">{{ wf.icon }}</span>
          <span class="ws-ph-name">{{ wf.name }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
const router = useRouter()
function navigateTo(path: string) { router.push(path) }

// ============================================================
// 一、创作类 — 全部功能卡片（场景+解决问题）
// ============================================================

const imageCards = [
  { path:'/work/image',         icon:'🏠', name:'图片工具首页',  scene:'统一入口，浏览所有图片工具', solve:'不用记住每个工具位置，一个入口搞定所有图片需求' },
  { path:'/work/main-image',    icon:'🖼', name:'主图生成',      scene:'淘宝/京东/拼多多/跨境等平台商品主图制作', solve:'不会PS也能做出各平台合规的高点击率商品主图，省去专业美工' },
  { path:'/work/scene',         icon:'🏞', name:'场景图生成',    scene:'商品摆在客厅/海滩/办公桌等场景里展示', solve:'不用租场地拍场景图，AI 自动把商品融入生活场景' },
  { path:'/work/poster',        icon:'📰', name:'海报生成',      scene:'促销海报/活动海报/新品首发海报', solve:'不会设计也能一键生成电商营销海报，0 设计基础出片' },
  { path:'/work/detail',        icon:'📋', name:'海报详情编辑',  scene:'编辑海报文字/调整排版/替换素材', solve:'修改海报不用从头再来，直接编辑已有模板快速迭代' },
  { path:'/work/remove-bg',     icon:'✂', name:'智能去背景',    scene:'商品拍照后去掉杂乱背景', solve:'手机随便拍，AI 3秒去掉背景，省去抠图时间和PS费用' },
  { path:'/work/white-bg',      icon:'⬜', name:'白底图生成',    scene:'平台要求纯白底商品图', solve:'一键生成符合淘宝/Amazon等平台规范的白底图，通过审核' },
  { path:'/work/color-swap',    icon:'🎯', name:'商品换色',      scene:'同一款衣服展示红/蓝/黑多种颜色', solve:'不用每色都拍照，AI 换色省去重复拍摄和多 SKU 拍摄成本' },
  { path:'/work/color-change',  icon:'🎨', name:'颜色替换',      scene:'指定区域替换颜色（如把红扣子改成黑扣子）', solve:'局部颜色调整不用重新拍照，指定区域精准替换' },
  { path:'/work/style-transfer',icon:'🖌', name:'风格迁移',      scene:'把实拍图变成油画/水彩/卡通/3D渲染风格', solve:'一键变风格，满足不同平台审美和营销活动差异化' },
  { path:'/work/text-effect',   icon:'🔤', name:'文字特效',      scene:'海报标题/促销文字加立体/金属/霓虹等特效', solve:'不会做特效字也能出高级感标题，套模板一键生成' },
  { path:'/work/outpaint',      icon:'↔', name:'智能外扩',      scene:'照片拍太小/构图不好，需要往外扩展画面', solve:'照片构图失败不用重拍，AI 智能扩展画面边缘补全场景' },
  { path:'/work/outpainting',   icon:'↕', name:'外扩入口',      scene:'需要更多外扩选项和精细控制', solve:'控制外扩方向和程度，满足精细化构图需求' },
  { path:'/work/retouch',       icon:'✨', name:'AI 精修',       scene:'商品图质感不够，需要调色/锐化/优化光影', solve:'一键提升商品图质感，不用学 Lightroom 和后期处理' },
  { path:'/work/wrinkle-remove',icon:'🧹', name:'去皱美颜',     scene:'服装类商品有褶皱，看起来不值钱', solve:'AI 自动去褶皱，平整衣服纹理，提升商品溢价感' },
  { path:'/work/ghost-mannequin',icon:'👤', name:'幽灵模特',    scene:'没人台没模特，需要展示上身效果', solve:'不用请模特、不用买人台，AI 自动生成隐形模特展示上身效果' },
  { path:'/work/translate-image',icon:'🌐', name:'图片翻译',    scene:'跨境商品图上的中文需要翻译成当地语言', solve:'一键翻译图片上的文字，省去多语种重新设计的成本' },
]

const videoCards = [
  { path:'/work/video',           icon:'🎥', name:'视频生成',     scene:'用几张商品图自动生成带货短视频', solve:'不会剪辑也能生成带货视频，降低短视频门槛至0' },
  { path:'/work/video-edit',      icon:'✂', name:'视频编辑',     scene:'已有视频需要剪辑/加字幕/加音乐/调色', solve:'在线剪辑不用装PR/剪映，AI 辅助自动剪辑' },
  { path:'/work/video-translate', icon:'🌐', name:'视频翻译',     scene:'跨境视频需要翻译语音/字幕/面容', solve:'一个视频多语种输出，语音字幕面容三合一翻译，跨境不再重拍' },
]

const faceCards = [
  { path:'/work/swap-face',       icon:'😊', name:'AI 换脸',      scene:'用指定人脸替换视频/图片中的人脸', solve:'不用真人出镜就能做出"本人推荐"内容，保护隐私同时提升信任' },
  { path:'/work/person-replace',  icon:'🔄', name:'人物替换',     scene:'把模特换成亚洲/欧美/中东不同人种', solve:'一套素材全球复用，换不同人种模特适配各市场审美' },
  { path:'/work/virtual-tryon',   icon:'👗', name:'虚拟试穿',     scene:'买家在网上看衣服上身效果', solve:'不用去实体店也能看衣服穿在身上的效果，提高转化率' },
  { path:'/work/digital-human',   icon:'🤖', name:'数字人带货',   scene:'用数字人口播介绍商品', solve:'不用请主播/KOL，数字人24小时带货，大幅降低直播和口播成本' },
  { path:'/work/model-generate',  icon:'🧍', name:'AI 模特生成',  scene:'没有模特资源，需要展示穿着效果', solve:'AI 生成各种体型肤色模特，不用签约模特公司' },
]

const voiceCards = [
  { path:'/work/voice-gen',       icon:'🔊', name:'AI 语音生成',  scene:'给视频/数字人配专业旁白/口播声音', solve:'不用自己录音、不用找配音员，AI 生成自然专业人声' },
  { path:'/work/voice-clone',     icon:'🎙', name:'声音克隆',     scene:'克隆店主/主播自己的声音', solve:'店铺所有视频统一配音风格，建立品牌声音 IP' },
]

const copyCards = [
  { path:'/work/copywriting',     icon:'✍', name:'智能文案',      scene:'写商品标题/卖点/种草文案/跨境翻译', solve:'不会写文案也能一键生成转化率高的电商标题和话术' },
  { path:'/work/script-gen',      icon:'📝', name:'短视频脚本生成',scene:'抖音/视频号/TikTok 带货视频口播脚本', solve:'不知道怎么拍带货视频，AI 写好口播+镜头提示直接开拍' },
]

const platformCards = [
  { path:'/work/size-templates',  icon:'📏', name:'平台尺寸模板库',scene:'淘宝/京东/Amazon/Shopee等13平台不同尺寸要求', solve:'不用手动查各平台尺寸规范，一键匹配省时不出错' },
  { path:'/work/platform-detail', icon:'📋', name:'平台详情页',    scene:'多平台商品详情页内容差异化管理', solve:'同一商品多平台详情页自动适配，不用逐个平台重新做' },
  { path:'/work/product-render',  icon:'🛒', name:'产品渲染',      scene:'3D 展示商品旋转/细节/使用场景', solve:'无需实物拍摄，3D渲染出高质量商品展示素材' },
  { path:'/work/detail-h5',       icon:'📱', name:'详情页 H5',    scene:'需要一个分享到微信/朋友圈的商品详情页', solve:'一键生成 H5 分享页，不用开发不用设计直接可用' },
]

const socialCards = [
  { path:'/work/social',          icon:'📱', name:'社媒封面生成',  scene:'小红书/抖音/Ins/Facebook 封面图统一输出', solve:'各社媒封面尺寸/风格不同，一键适配全部平台' },
  { path:'/work/action-transfer', icon:'🕺', name:'动作迁移',      scene:'让静态模特做出走路/转身/挥手等动态效果', solve:'不用拍视频也能产出动态素材，丰富社媒内容形式' },
  { path:'/work/compliance-check',icon:'🛡', name:'合规检测',      scene:'检查文案/图片是否违反广告法或平台规则', solve:'自动扫描禁用词/违规内容，发布前避坑不扣分不罚款' },
  { path:'/work/viral-clone',     icon:'📋', name:'爆款克隆',      scene:'看到同行爆款素材想快速做一个类似的', solve:'参考爆款结构快速产出类似素材，跟着爆款节奏起量' },
  { path:'/work/viral-replicate', icon:'🔥', name:'爆款复刻',      scene:'分析爆款视频/图文的数据和结构', solve:'用AI解构爆款规律，指导内容方向少走弯路' },
  { path:'/work/compare',         icon:'🔍', name:'图片对比',      scene:'对比两个版本素材哪张效果更好', solve:'并排/滑动/叠图三种模式直观对比，选最优方案上线' },
  { path:'/work/shot-plan',       icon:'📐', name:'分镜计划',      scene:'规划视频分镜/镜头顺序/时长分配', solve:'拍视频前做好分镜规划，避免拍摄时不知道拍什么' },
  { path:'/work/shot-panorama',   icon:'🔄', name:'全景拍摄',      scene:'360°展示商品各个角度', solve:'不用拍多角度照片，AI 生成全景展示提升买家信任感' },
  { path:'/work/storyboard',      icon:'🎞', name:'故事板',        scene:'视频创意的可视化故事板预览', solve:'开拍前预览成片效果，减少返工和无效拍摄' },
]

const efficiencyCards = [
  { path:'/work/batch',           icon:'📦', name:'批量处理',      scene:'一次处理50张商品图统一抠图+白底+尺寸', solve:'批量操作代替逐张处理，50张图10分钟搞定效率提升10倍' },
  { path:'/work/publish',         icon:'📤', name:'一键发布',      scene:'生成好的素材一键发布到多个平台', solve:'不用逐个平台登录上传，一键搞定多平台分发' },
  { path:'/work/output',          icon:'📁', name:'导出设置',      scene:'设置导出格式/尺寸/水印/命名规则', solve:'统一导出规范，减少手动调整格式的重复劳动' },
  { path:'/work/usage',           icon:'📊', name:'用量统计',      scene:'查看每天生成了多少素材/用了多少额度', solve:'用量可视化，合理规划每月生成预算' },
  { path:'/work/brand-settings',  icon:'🏷', name:'品牌设置',      scene:'统一设置品牌Logo/颜色/字体', solve:'所有素材自动应用品牌规范，保持视觉一致性' },
  { path:'/work/prompt-hub',      icon:'💡', name:'提示词市场',    scene:'查找/分享优质作图的提示词模板', solve:'不会写提示词直接用别人的优质模板，社区共享降低创作门槛' },
]

const ecoCards = [
  { path:'/work/diy-pages',       icon:'🛠', name:'DIY 页面',      scene:'拖拽式搭建店铺自定义营销页面', solve:'不用开发不用设计，拖拽组件自由搭建店铺页面' },
  { path:'/work/distribution',    icon:'📡', name:'分销推广',      scene:'设置分销佣金/招募分销员/裂变推广', solve:'搭建分销体系，让更多人帮你卖货不用付固定工资' },
  { path:'/work/cut-ecosystem',   icon:'✂', name:'剪映生态',      scene:'与剪映工具打通/素材导入导出', solve:'在剪映生态里直接使用 Movio 生成的素材' },
  { path:'/work/marketplace',     icon:'🏪', name:'场景模板市场',  scene:'浏览/购买/下载行业现成创作模板', solve:'不用从零创作，套用行业模板快速出片' },
]

// ============================================================
// 二、AI 助手类 — 只预留名称，不开发
// ============================================================
const aiAgents = [
  { icon:'💬', name:'店铺客服智能体' },
  { icon:'🏪', name:'店铺运营智能体' },
  { icon:'📢', name:'营销推广智能体' },
  { icon:'🛒', name:'商品优化智能体' },
  { icon:'🔥', name:'选品爆款智能体' },
  { icon:'🔎', name:'竞品分析智能体' },
  { icon:'⭐', name:'评价管理智能体' },
  { icon:'🛡', name:'违规风控智能体' },
  { icon:'🎓', name:'行业专家智能体' },
  { icon:'📊', name:'数据分析智能体' },
  { icon:'📺', name:'直播专属智能体' },
]

// ============================================================
// 三、工作流类 — 只预留名称，不开发
// ============================================================
const workflows = [
  { icon:'🏪', name:'店铺日常运营工作流' },
  { icon:'🆕', name:'商品上新全流程工作流' },
  { icon:'🔥', name:'爆款内容批量生产工作流' },
  { icon:'⭐', name:'评价 & 问大家自动维护' },
  { icon:'🎉', name:'大促活动营销工作流' },
  { icon:'📊', name:'每日数据自动复盘工作流' },
  { icon:'🛡', name:'违规自查风控工作流' },
  { icon:'📱', name:'私域引流转化工作流' },
]
</script>

<style scoped>
.ws-home { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }

.ws-hero { margin-bottom: 40px; }
.ws-hero-title { font-size: 28px; font-weight: 700; color: var(--cfg-text-primary); margin: 0 0 8px; }
.ws-hero-sub { font-size: 14px; color: var(--cfg-text-muted); margin: 0; }

/* Category section */
.ws-category { margin-bottom: 48px; }
.ws-category-placeholder { opacity: 0.65; }
.ws-cat-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.ws-cat-title { font-size: 22px; font-weight: 700; color: var(--cfg-text-primary); margin: 0; }
.ws-cat-badge { font-size: 12px; padding: 2px 10px; border-radius: 10px; font-weight: 600; }
.ws-cat-badge.active { background: #e8f5e9; color: #2e7d32; }
.ws-cat-badge.coming { background: #fff3e0; color: #e65100; }
.ws-cat-desc { font-size: 14px; color: var(--cfg-text-muted); margin: 0 0 16px; line-height: 1.6; }

/* Sub group */
.ws-sub-group { margin-bottom: 28px; }
.ws-sub-title { font-size: 16px; font-weight: 600; color: var(--cfg-text-primary); margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
.ws-tag { font-size: 11px; padding: 1px 8px; border-radius: 6px; background: #e3f2fd; color: #1565c0; font-weight: 500; }

/* Card grid */
.ws-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.ws-card {
  display: flex; gap: 12px; padding: 16px; border-radius: 10px;
  background: var(--cfg-bg-primary); border: 1px solid var(--cfg-border);
  cursor: pointer; transition: all 0.15s;
}
.ws-card:hover { border-color: var(--cfg-primary); box-shadow: 0 2px 12px rgba(0,0,0,0.06); transform: translateY(-1px); }
.ws-card-icon { font-size: 24px; flex-shrink: 0; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--cfg-bg-secondary); border-radius: 8px; }
.ws-card-body { flex: 1; min-width: 0; }
.ws-card-name { font-size: 14px; font-weight: 600; color: var(--cfg-text-primary); margin: 0 0 4px; }
.ws-card-use { font-size: 12px; color: var(--cfg-primary); margin: 0 0 2px; line-height: 1.4; }
.ws-card-solve { font-size: 12px; color: var(--cfg-text-muted); margin: 0; line-height: 1.4; }

/* Placeholder grid */
.ws-placeholder-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-top: 12px; }
.ws-ph-card {
  display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 8px;
  background: var(--cfg-bg-primary); border: 1px dashed var(--cfg-border);
}
.ws-ph-icon { font-size: 20px; }
.ws-ph-name { font-size: 13px; color: var(--cfg-text-muted); }
</style>
