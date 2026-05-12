// 全局动效插件 — 提供 v-animate 指令
export default defineNuxtPlugin(() => {
  const observer = process.client
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const anim = el.dataset.animate || 'anim-fade-in-up'
            const delay = el.dataset.animateDelay || '0'
            el.style.animationDelay = `${delay}ms`
            el.classList.add(anim)
            observer.unobserve(el)
          }
        })
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })
    : null

  return {
    provide: {
      animate: (el: HTMLElement, animation: string, delay = 0) => {
        if (!process.client) return
        el.dataset.animate = animation
        el.dataset.animateDelay = String(delay)
        el.style.opacity = '0'
        observer?.observe(el)
      },
    },
  }
})
