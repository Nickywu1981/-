import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);

const localeMap: Record<string, string> = { zh: 'zh-cn', en: 'en', es: 'es' };

function getLocale(): string {
  if (typeof window === 'undefined') return 'zh-cn';
  try {
    const settings = window.localStorage.getItem('app-settings');
    if (settings) {
      const { locale } = JSON.parse(settings);
      return localeMap[locale] || 'zh-cn';
    }
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string }; if (import.meta.dev) console.warn('[format] 解析locale设置失败', e?.message || err) }
  return 'zh-cn';
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

export function formatCurrency(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

export function formatDate(iso: string, format = 'YYYY-MM-DD'): string {
  if (!iso) return '';
  return dayjs(iso).format(format);
}

export function formatDateTime(iso: string, format = 'YYYY-MM-DD HH:mm'): string {
  if (!iso) return '';
  return dayjs(iso).format(format);
}

export function formatRelative(iso: string): string {
  if (!iso) return '';
  return dayjs(iso).locale(getLocale()).fromNow();
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}时${m}分`;
}

export function isToday(iso: string): boolean {
  return dayjs(iso).isSame(dayjs(), 'day');
}

export function isThisWeek(iso: string): boolean {
  return dayjs(iso).isSame(dayjs(), 'week');
}

const PLATFORM_MAP: Record<string, string> = {
  taobao: '淘宝', pdd: '拼多多', douyin: '抖音', xiaohongshu: '小红书',
  shipinhao: '视频号', amazon: '亚马逊', temu: 'Temu', shein: 'Shein',
  tiktok: 'TikTok Shop', meikeduo: '美客多', ozon: 'Ozon', shopee: 'Shopee', lazada: 'Lazada',
};

export function formatPlatformName(code: string): string {
  return PLATFORM_MAP[code] || code;
}

export function isValidImageFile(file: File): boolean {
  return file.type.startsWith('image/') && file.size > 0 && file.size <= 20 * 1024 * 1024;
}

export function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    if (import.meta.dev) console.warn('[format] 复制到剪贴板失败', e?.message || err)
    return false;
  }
}

export function formatDateLocale(iso: string): string {
  return iso ? new Date(iso).toLocaleDateString('zh-CN') : '-';
}

export function formatDateTimeLocale(iso: string): string {
  return iso ? new Date(iso).toLocaleString('zh-CN') : '-';
}

export function fmtMoney(n: number | string): string {
  return (Number(n) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

export function fmtNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n.toLocaleString('zh-CN')
}
