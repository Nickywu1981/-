/**
 * Onboarding guide composable — 6-step walkthrough using i18n keys
 * Usage: const guide = useOnboarding(); in onMounted call guide.checkAndShow()
 */
export function useOnboarding() {
  const { t } = useI18n()

  const stepKeys = [
    { key: 'welcome',     target: '', position: 'center' as const, icon: '✨' },
    { key: 'step1',       target: '', icon: '🖼️' },
    { key: 'step2',       target: '', icon: '🏞️' },
    { key: 'step3',       target: '', icon: '📄' },
    { key: 'step4',       target: '', icon: '🎬' },
    { key: 'start',       target: '', icon: '🚀' },
  ]

  const steps = computed(() =>
    stepKeys.map(s => ({
      ...s,
      title: t(`onboarding.${s.key}_title`),
      desc: t(`onboarding.${s.key}_desc`),
    }))
  )

  const isVisible = ref(false)
  const currentStep = ref(0)
  const dismissed = ref(false)

  const hasSeenGuide = () => {
    if (import.meta.server) return true
    try { return localStorage.getItem('movio_onboarding_done') === '1' } catch { return false }
  }

  const markSeen = () => {
    if (!import.meta.server) { try { localStorage.setItem('movio_onboarding_done', '1') } catch { /* storage full or private mode */ } }
    dismissed.value = true
    isVisible.value = false
  }

  let _timer: ReturnType<typeof setTimeout> | null = null

  const checkAndShow = () => {
    if (import.meta.server) return
    if (!hasSeenGuide()) {
      _timer = setTimeout(() => { isVisible.value = true }, 800)
    }
  }

  onUnmounted(() => { if (_timer) clearTimeout(_timer) })

  const next = () => {
    if (currentStep.value < steps.value.length - 1) currentStep.value++
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
