/**
 * 新手引导 Composable — 6 步走完核心工作流
 * 使用: const guide = useOnboarding(); 在 onMounted 中调用 guide.checkAndShow()
 */
export default function useOnboarding() {
  const steps = [
    { title: '欢迎来到 Movio AI', desc: '一站式电商视觉创作平台，从主图到视频，一个工具搞定全部图文素材。', target: '', position: 'center' as const },
    { title: '第1步：生成主图', desc: '上传商品照片，AI 自动抠图、换白底、精修细节，生成高质量商品主图。', target: '', icon: '🖼️' },
    { title: '第2步：场景图', desc: '选择场景模板或上传参考图，AI 将商品融入场景，生成营销级场景图。', target: '', icon: '🏞️' },
    { title: '第3步：详情页', desc: '基于主图和场景图，AI 自动生成完整商品详情页文案+图文排版。', target: '', icon: '📄' },
    { title: '第4步：短视频', desc: '用图片生成营销短视频，支持批量动作迁移、口播数字人等多种玩法。', target: '', icon: '🎬' },
    { title: '开始创作', desc: '在左侧导航栏选择功能模块，或点击下方快捷入口开始您的第一次创作。', target: '', icon: '🚀' },
  ]

  const isVisible = ref(false)
  const currentStep = ref(0)
  const dismissed = ref(false)

  const hasSeenGuide = () => {
    if (import.meta.server) return true
    return localStorage.getItem('movio_onboarding_done') === '1'
  }

  const markSeen = () => {
    if (!import.meta.server) localStorage.setItem('movio_onboarding_done', '1')
    dismissed.value = true
    isVisible.value = false
  }

  const checkAndShow = () => {
    if (import.meta.server) return
    if (!hasSeenGuide()) {
      const timer = setTimeout(() => { isVisible.value = true }, 800)
      onUnmounted(() => clearTimeout(timer))
    }
  }

  const next = () => {
    if (currentStep.value < steps.length - 1) currentStep.value++
    else { markSeen() }
  }

  const prev = () => {
    if (currentStep.value > 0) currentStep.value--
  }

  const skip = () => { markSeen() }

  return {
    steps, isVisible, currentStep, dismissed,
    checkAndShow, next, prev, skip, markSeen, hasSeenGuide,
  }
}
