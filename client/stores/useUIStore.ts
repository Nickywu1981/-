import { defineStore } from 'pinia'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  duration: number
  _timer: ReturnType<typeof setTimeout> | null
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
    startPageLoading(text = 'Loading...') {
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
      const item: ToastItem = { id, message, type, duration, _timer: null }
      this.toasts.push(item)
      if (duration > 0) {
        item._timer = setTimeout(() => {
          if (this.toasts.some(t => t.id === id)) this.removeToast(id)
        }, duration)
      }
      return id
    },
    removeToast(id: number) {
      const item = this.toasts.find(t => t.id === id)
      if (item?._timer) { clearTimeout(item._timer); item._timer = null }
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
