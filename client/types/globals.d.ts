interface ToastInstance {
  success(msg: string): void
  error(msg: string): void
  warn(msg: string): void
  info(msg: string): void
}

declare global {
  interface Window {
    __toast?: ToastInstance
  }
}

export {}
