// 按需加载 CSS：仅导入实际使用的组件样式 (~150KB vs 全量 ~350KB，节省 57%)
import { computed, watch } from 'vue'
import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/el-message.css'
import 'element-plus/theme-chalk/el-button.css'
import 'element-plus/theme-chalk/el-input.css'
import 'element-plus/theme-chalk/el-input-number.css'
import 'element-plus/theme-chalk/el-form.css'
import 'element-plus/theme-chalk/el-form-item.css'
import 'element-plus/theme-chalk/el-row.css'
import 'element-plus/theme-chalk/el-col.css'
import 'element-plus/theme-chalk/el-select.css'
import 'element-plus/theme-chalk/el-option.css'
import 'element-plus/theme-chalk/el-tabs.css'
import 'element-plus/theme-chalk/el-alert.css'
import 'element-plus/theme-chalk/el-tag.css'
import 'element-plus/theme-chalk/el-card.css'
import 'element-plus/theme-chalk/el-table.css'
import 'element-plus/theme-chalk/el-table-column.css'
import 'element-plus/theme-chalk/el-pagination.css'
import 'element-plus/theme-chalk/el-switch.css'
import 'element-plus/theme-chalk/el-collapse-transition.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';
import en from 'element-plus/dist/locale/en.mjs';
import { setFormatLocale } from '~/utils/format';

export default defineNuxtPlugin(() => {
  // 组件采用按需导入（copywriting.vue / workspace-diy.vue 中各自 import）
  // 全局注册已移除（约 1.2MB JS），仅保留 CSS 与动态语言包
  const { locale } = useI18n()
  const elLocale = computed(() => locale.value === 'en' ? en : zhCn)

  // 同步 format.ts 的 locale（替代其直接读 localStorage）
  watch(locale, (val) => setFormatLocale(val), { immediate: true })

  return { provide: { elLocale } };
});
