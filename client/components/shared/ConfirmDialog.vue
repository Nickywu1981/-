<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div v-if="visible" class="confirm-overlay" @click.self="onCancel" @keydown.escape="onCancel">
        <div class="confirm-dialog" role="alertdialog" aria-modal="true" :aria-label="title">
          <div class="confirm-header">
            <h3>{{ title }}</h3>
          </div>
          <div class="confirm-body">{{ message }}</div>
          <div class="confirm-footer">
            <button class="btn-cancel" @click="onCancel" ref="cancelBtn">{{ cancelText }}</button>
            <button class="btn-confirm" :class="variantClass" @click="onConfirm" ref="confirmBtn">{{ confirmText }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { t } = useI18n()

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary'
}

const visible = ref(false)
const title = ref('')
const message = ref('')
const confirmText = ref(t('common.confirm'))
const cancelText = ref(t('common.cancel'))
const variant = ref<'danger'|'warning'|'primary'>('danger')
const cancelBtn = ref<HTMLButtonElement>()
const confirmBtn = ref<HTMLButtonElement>()

let resolvePromise: ((value: boolean) => void) | null = null
let previousActiveElement: HTMLElement | null = null

const variantClass = computed(() => ({
  'btn-danger': variant.value === 'danger',
  'btn-warning': variant.value === 'warning',
  'btn-primary': variant.value === 'primary',
}))

async function show(opts: ConfirmOptions): Promise<boolean> {
  title.value = opts.title || t('common.confirm')
  message.value = opts.message
  confirmText.value = opts.confirmText || t('common.confirm')
  cancelText.value = opts.cancelText || t('common.cancel')
  variant.value = opts.variant || 'danger'
  previousActiveElement = document.activeElement as HTMLElement
  visible.value = true
  await nextTick()
  confirmBtn.value?.focus()
  return new Promise((resolve) => { resolvePromise = resolve })
}

function onConfirm() {
  visible.value = false
  resolvePromise?.(true)
  resolvePromise = null
  restoreFocus()
}

function onCancel() {
  visible.value = false
  resolvePromise?.(false)
  resolvePromise = null
  restoreFocus()
}

function restoreFocus() {
  if (previousActiveElement?.focus) {
    previousActiveElement.focus()
    previousActiveElement = null
  }
}

defineExpose({ show })
</script>

<style scoped>
.confirm-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center;
}
.confirm-dialog {
  background: var(--bg-primary, #fff); border-radius: 12px; padding: 24px;
  min-width: 360px; max-width: 480px; box-shadow: 0 8px 32px rgba(0,0,0,.15);
}
.confirm-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
.confirm-body { margin-top: 12px; font-size: 14px; color: var(--text-secondary, #666); line-height: 1.6; }
.confirm-footer { margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px; }
.btn-cancel {
  padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border, #ddd);
  background: var(--bg-secondary, #f5f5f5); cursor: pointer; font-size: 14px;
}
.btn-confirm {
  padding: 8px 20px; border-radius: 8px; border: none; color: #fff; cursor: pointer; font-size: 14px;
}
.btn-danger { background: var(--danger, #dc2626); }
.btn-warning { background: var(--warning, #f59e0b); }
.btn-primary { background: var(--brand, #5b5fe3); }

.confirm-fade-enter-active, .confirm-fade-leave-active { transition: opacity .2s ease; }
.confirm-fade-enter-from, .confirm-fade-leave-to { opacity: 0; }
</style>
