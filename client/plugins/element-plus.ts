// 按需加载：仅 ElConfigProvider + ElMessage，替代全量 ~200KB CSS
import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/el-message.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import en from 'element-plus/dist/locale/en.mjs';
import { setFormatLocale } from '~/utils/format';

export default defineNuxtPlugin(() => {
  // ElMessage 采用命令式调用，已在 copywriting.vue / workspace-diy.vue 中直接 import
  // 全库注册已移除（约 1.2MB JS），仅保留 CSS 与动态语言包
  const { locale } = useI18n()
  const elLocale = computed(() => locale.value === 'en' ? en : zhCn)

  // 同步 format.ts 的 locale（替代其直接读 localStorage）
  watch(locale, (val) => setFormatLocale(val), { immediate: true })

  return { provide: { elLocale } };
});
