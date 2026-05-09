export default function useOnboarding() {
  const isVisible = ref(false)
  const currentStep = ref(0)

  const steps = [
    { icon: '🖼️', title: 'AI 商品图生成', desc: '上传产品图，一键生成多平台合规主图、场景图、白底图' },
    { icon: '🎬', title: '短视频创作', desc: '图片转视频、数字人口播、动作迁移，轻松制作带货视频' },
    { icon: '✍️', title: '智能文案生成', desc: 'AI 生成商品标题、卖点文案、跨境翻译，适配 13 个电商平台' },
    { icon: '🎨', title: 'DIY 页面搭建', desc: '拖拽式可视化编辑器，20 套行业模板，快速搭建 H5 落地页' },
    { icon: '📊', title: '数据中心', desc: '查看使用统计、任务进度，管理你的 AI 资产生成记录' },
  ]

  function checkAndShow() {
    if (import.meta.server) return
    if (localStorage.getItem('onboarding_done')) return
    isVisible.value = true
  }

  function next() {
    if (currentStep.value < steps.length - 1) { currentStep.value++ }
    else { skip() }
  }

  function prev() {
    if (currentStep.value > 0) currentStep.value--
  }

  function skip() {
    isVisible.value = false
    localStorage.setItem('onboarding_done', '1')
  }

  return { isVisible, currentStep, steps, checkAndShow, next, prev, skip }
}
