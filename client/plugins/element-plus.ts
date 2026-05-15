import 'element-plus/dist/index.css';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import en from 'element-plus/dist/locale/en.mjs';

export default defineNuxtPlugin(() => {
  // ElMessage 采用命令式调用，已在 copywriting.vue / workspace-diy.vue 中直接 import
  // 全库注册已移除（约 1.2MB JS），仅保留 CSS 与动态语言包
  const { locale } = useI18n()
  const elLocale = computed(() => locale.value === 'en' ? en : zhCn)
  return { provide: { elLocale } };
});
