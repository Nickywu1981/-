/**
 * UI 常量 — 消除全项目散落的魔法数字
 *
 * 使用: import { POLL_INTERVAL, TOAST_DURATION, Z_INDEX } from '~/constants/ui'
 */
export const POLL_INITIAL_MS = 1000
export const POLL_INTERVAL_MS = 3000
export const POLL_BACKOFF_MS = 5000
export const POLL_MAX_BACKOFF_MS = 15000
export const TOAST_DURATION_MS = 3000
export const TOAST_ERROR_DURATION_MS = 5000
export const AUTO_SAVE_INTERVAL_MS = 10000
export const REDIRECT_UNLOCK_MS = 5000
export const COUNTDOWN_SECONDS = 60

export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 2000,
  DRAWER: 3000,
  MODAL: 5000,
  TOAST: 6000,
  TOOLTIP: 7000,
} as const
