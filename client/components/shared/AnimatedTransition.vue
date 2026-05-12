<!-- 动效过渡包装器 — 支持 fade/slide/scale/zoom 动效 -->
<template>
  <Transition :name="transitionName" mode="out-in" @before-enter="onBeforeEnter" @enter="onEnter" @leave="onLeave">
    <slot />
  </Transition>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  type?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale' | 'zoom'
  duration?: number
}>(), {
  type: 'fade',
  duration: 300,
})

const transitionName = `anim-${useAttrs().type || 'fade'}`

function onBeforeEnter(el: Element) { (el as HTMLElement).style.setProperty('--anim-duration', `${useAttrs().duration || 300}ms`) }
function onEnter(_el: Element) {}
function onLeave(_el: Element) {}
</script>

<style>
/* fade */
.anim-fade-enter-active, .anim-fade-leave-active { transition: opacity var(--anim-duration, 300ms) ease; }
.anim-fade-enter-from, .anim-fade-leave-to { opacity: 0; }

/* slide */
.anim-slide-up-enter-active, .anim-slide-up-leave-active,
.anim-slide-down-enter-active, .anim-slide-down-leave-active,
.anim-slide-left-enter-active, .anim-slide-left-leave-active,
.anim-slide-right-enter-active, .anim-slide-right-leave-active {
  transition: all var(--anim-duration, 300ms) ease;
}
.anim-slide-up-enter-from    { transform: translateY(12px); opacity: 0; }
.anim-slide-up-leave-to      { transform: translateY(-12px); opacity: 0; }
.anim-slide-down-enter-from  { transform: translateY(-12px); opacity: 0; }
.anim-slide-down-leave-to    { transform: translateY(12px); opacity: 0; }
.anim-slide-left-enter-from  { transform: translateX(12px); opacity: 0; }
.anim-slide-left-leave-to    { transform: translateX(-12px); opacity: 0; }
.anim-slide-right-enter-from { transform: translateX(-12px); opacity: 0; }
.anim-slide-right-leave-to   { transform: translateX(12px); opacity: 0; }

/* scale */
.anim-scale-enter-active, .anim-scale-leave-active { transition: all var(--anim-duration, 300ms) ease; }
.anim-scale-enter-from { transform: scale(0.95); opacity: 0; }
.anim-scale-leave-to   { transform: scale(0.95); opacity: 0; }

/* zoom */
.anim-zoom-enter-active, .anim-zoom-leave-active { transition: all var(--anim-duration, 300ms) cubic-bezier(0.4, 0, 0.2, 1); }
.anim-zoom-enter-from { transform: scale(0); opacity: 0; }
.anim-zoom-leave-to   { transform: scale(0); opacity: 0; }
</style>
