import 'element-plus/dist/index.css';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';

export default defineNuxtPlugin(() => {
  // ElMessage 采用命令式调用，已在 copywriting.vue / workspace-diy.vue 中直接 import
  // 全库注册已移除（约 1.2MB JS），仅保留 CSS 与中文语言包
  return { provide: { elLocale: zhCn } };
});
