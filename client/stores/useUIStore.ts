import { defineStore } from 'pinia'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  duration: number
}

interface ModalState {
  id: string
  component: string
  props?: Record<string, any>
  resolve?: (val: any) => void
}

interface UIState {
  pageLoading: boolean
  globalLoading: boolean
  loadingText: string
  toasts: ToastItem[]
  modals: ModalState[]
}

let _toastId = 0

export const useUIStore = defineStore('ui', {
  state: (): UIState => ({
    pageLoading: false,
    globalLoading: false,
    loadingText: '',
    toasts: [],
    modals: [],
  }),

  getters: {
    isLoading: (state) => state.pageLoading || state.globalLoading,
    currentModal: (state) => state.modals[state.modals.length - 1] || null,
  },

  actions: {
    startPageLoading(text = '加载中...') {
      this.pageLoading = true
      this.loadingText = text
    },
    stopPageLoading() {
      this.pageLoading = false
      this.loadingText = ''
    },

    setGlobalLoading(v: boolean, text = '') {
      this.globalLoading = v
      this.loadingText = text
    },

    toast(message: string, type: ToastItem['type'] = 'info', duration = 3000) {
      const id = ++_toastId
      this.toasts.push({ id, message, type, duration })
      if (duration > 0) setTimeout(() => this.removeToast(id), duration)
      return id
    },
    removeToast(id: number) {
      this.toasts = this.toasts.filter(t => t.id !== id)
    },

    openModal(component: string, props?: Record<string, any>): Promise<any> {
      return new Promise((resolve) => {
        this.modals.push({ id: `modal_${Date.now()}`, component, props, resolve })
      })
    },
    closeModal(result?: any) {
      const modal = this.modals.pop()
      modal?.resolve?.(result)
    },
    closeAllModals() {
      while (this.modals.length) this.closeModal()
    },
  },
})
