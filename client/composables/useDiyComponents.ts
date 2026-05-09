/**
 * DIY 编辑器组件库定义 (TypeScript)
 * 12 类组件，含默认配置、属性schema、缩略图标识
 */
import type { DiyComponent, DiyComponentCategory, ComponentProp } from '~/types/diy'

interface DiyComponentCatalog {
  categories: DiyComponentCategory[]
  components: DiyComponent[]
}

export const DIY_COMPONENTS: DiyComponentCatalog = {
  categories: [
    { key: 'banner',   label: '横幅/轮播', icon: '🖼️' },
    { key: 'product',  label: '商品/营销', icon: '🛒' },
    { key: 'gallery',  label: '图片/视频', icon: '📷' },
    { key: 'text',     label: '文本',       icon: '📝' },
    { key: 'form',     label: '表单',       icon: '📋' },
    { key: 'nav',      label: '导航',       icon: '📍' },
  ],

  components: [
    // ── Banner ──
    {
      component_code: 'banner_slider', name: '轮播横幅', category: 'banner', icon: '🎠',
      thumbnail: 'swiper',
      default_config: { slides: [{ img: '' }], autoplay: true, interval: 3000, height: 200, radius: 8 },
      props: [
        { key: 'height', label: '高度(px)', type: 'number', default: 200 },
        { key: 'autoplay', label: '自动播放', type: 'checkbox', default: true },
        { key: 'interval', label: '间隔(ms)', type: 'number', default: 3000, show: (cfg: Record<string, any>) => cfg.autoplay },
        { key: 'radius', label: '圆角(px)', type: 'number', default: 8 },
      ],
    },
    // ── 文本类 ──
    {
      component_code: 'title_bar', name: '标题栏', category: 'text', icon: '📌',
      thumbnail: 'title',
      default_config: { title: '标题文本', subtitle: '', align: 'center', color: '#333', fontSize: 18, bgColor: '#ffffff' },
      props: [
        { key: 'title', label: '主标题', type: 'text', default: '标题文本' },
        { key: 'subtitle', label: '副标题', type: 'text', default: '' },
        { key: 'align', label: '对齐', type: 'select', options: ['left', 'center', 'right'], default: 'center' },
        { key: 'fontSize', label: '字号(px)', type: 'number', default: 18 },
        { key: 'color', label: '文字颜色', type: 'color', default: '#333' },
        { key: 'bgColor', label: '背景色', type: 'color', default: '#ffffff' },
      ],
    },
    {
      component_code: 'text_block', name: '文本段落', category: 'text', icon: '📄',
      thumbnail: 'text',
      default_config: { content: '请输入文本内容', align: 'left', color: '#666', fontSize: 14, lineHeight: 1.6 },
      props: [
        { key: 'content', label: '内容', type: 'textarea', default: '请输入文本内容' },
        { key: 'align', label: '对齐', type: 'select', options: ['left', 'center', 'right'], default: 'left' },
        { key: 'fontSize', label: '字号(px)', type: 'number', default: 14 },
        { key: 'color', label: '文字颜色', type: 'color', default: '#666' },
        { key: 'lineHeight', label: '行高', type: 'number', default: 1.6, step: 0.1 },
      ],
    },
    // ── 商品/营销 ──
    {
      component_code: 'product_list', name: '商品列表', category: 'product', icon: '🛍️',
      thumbnail: 'grid',
      default_config: { columns: 2, showPrice: true, showBadge: true, gap: 10, radius: 8 },
      props: [
        { key: 'columns', label: '列数', type: 'select', options: [1, 2, 3, 4], default: 2 },
        { key: 'showPrice', label: '显示价格', type: 'checkbox', default: true },
        { key: 'showBadge', label: '显示角标', type: 'checkbox', default: true },
        { key: 'gap', label: '间距(px)', type: 'number', default: 10 },
        { key: 'radius', label: '圆角(px)', type: 'number', default: 8 },
      ],
    },
    {
      component_code: 'countdown', name: '倒计时', category: 'product', icon: '⏰',
      thumbnail: 'countdown',
      default_config: { endTime: '', title: '限时优惠', color: '#ff4444', bgColor: '#fff5f5', fontSize: 24 },
      props: [
        { key: 'title', label: '标题', type: 'text', default: '限时优惠' },
        { key: 'endTime', label: '结束时间', type: 'datetime', default: '' },
        { key: 'color', label: '数字颜色', type: 'color', default: '#ff4444' },
        { key: 'fontSize', label: '字号(px)', type: 'number', default: 24 },
      ],
    },
    {
      component_code: 'coupon_card', name: '优惠券', category: 'product', icon: '🎫',
      thumbnail: 'card',
      default_config: { title: '优惠券', amount: '¥10', condition: '满100可用', color: '#ff6600', radius: 8 },
      props: [
        { key: 'title', label: '标题', type: 'text', default: '优惠券' },
        { key: 'amount', label: '金额', type: 'text', default: '¥10' },
        { key: 'condition', label: '使用条件', type: 'text', default: '满100可用' },
        { key: 'color', label: '主题色', type: 'color', default: '#ff6600' },
      ],
    },
    {
      component_code: 'button_group', name: '按钮组', category: 'product', icon: '🔘',
      thumbnail: 'buttons',
      default_config: { buttons: [{ text: '立即购买', link: '', color: '#ff4444' }], direction: 'row', gap: 10, radius: 20 },
      props: [
        { key: 'direction', label: '排列方向', type: 'select', options: ['row', 'column'], default: 'row' },
        { key: 'gap', label: '间距(px)', type: 'number', default: 10 },
        { key: 'radius', label: '圆角(px)', type: 'number', default: 20 },
      ],
    },
    // ── 图片/视频 ──
    {
      component_code: 'image_showcase', name: '图片展示', category: 'gallery', icon: '🖼️',
      thumbnail: 'image',
      default_config: { images: [{ src: '', link: '' }], columns: 2, gap: 8, radius: 8, aspectRatio: '1:1' },
      props: [
        { key: 'columns', label: '列数', type: 'select', options: [1, 2, 3], default: 2 },
        { key: 'gap', label: '间距(px)', type: 'number', default: 8 },
        { key: 'radius', label: '圆角(px)', type: 'number', default: 8 },
        { key: 'aspectRatio', label: '宽高比', type: 'select', options: ['1:1', '4:3', '16:9', '3:4'], default: '1:1' },
      ],
    },
    {
      component_code: 'video_player', name: '视频播放器', category: 'gallery', icon: '▶️',
      thumbnail: 'video',
      default_config: { src: '', poster: '', autoplay: false, controls: true, aspectRatio: '16:9', radius: 8 },
      props: [
        { key: 'src', label: '视频地址', type: 'text', default: '' },
        { key: 'poster', label: '封面图', type: 'image', default: '' },
        { key: 'autoplay', label: '自动播放', type: 'checkbox', default: false },
        { key: 'controls', label: '显示控制栏', type: 'checkbox', default: true },
        { key: 'aspectRatio', label: '宽高比', type: 'select', options: ['16:9', '4:3', '9:16'], default: '16:9' },
      ],
    },
    {
      component_code: 'hotzone_image', name: '热区图片', category: 'gallery', icon: '🎯',
      thumbnail: 'hotzone',
      default_config: { src: '', zones: [{ x: 0, y: 0, w: 100, h: 100, link: '' }], radius: 8 },
      props: [
        { key: 'src', label: '图片地址', type: 'image', default: '' },
        { key: 'radius', label: '圆角(px)', type: 'number', default: 8 },
      ],
    },
    // ── 表单 ──
    {
      component_code: 'form_container', name: '表单容器', category: 'form', icon: '📋',
      thumbnail: 'form',
      default_config: { fields: [], submitText: '提交', bgColor: '#ffffff', radius: 8, padding: 16 },
      props: [
        { key: 'submitText', label: '提交按钮文字', type: 'text', default: '提交' },
        { key: 'bgColor', label: '背景色', type: 'color', default: '#ffffff' },
        { key: 'radius', label: '圆角(px)', type: 'number', default: 8 },
        { key: 'padding', label: '内边距(px)', type: 'number', default: 16 },
      ],
    },
    // ── 导航 ──
    {
      component_code: 'nav_bar', name: '导航栏', category: 'nav', icon: '🧭',
      thumbnail: 'nav',
      default_config: {
        items: [{ text: '首页', link: '', icon: '🏠' }],
        fixed: false, bgColor: '#ffffff', textColor: '#333', activeColor: '#6366f1',
      },
      props: [
        { key: 'fixed', label: '固定顶部', type: 'checkbox', default: false },
        { key: 'bgColor', label: '背景色', type: 'color', default: '#ffffff' },
        { key: 'textColor', label: '文字颜色', type: 'color', default: '#333' },
        { key: 'activeColor', label: '选中颜色', type: 'color', default: '#6366f1' },
      ],
    },
  ],
}

export function getComponentByCode(code: string): DiyComponent | undefined {
  return DIY_COMPONENTS.components.find(c => c.component_code === code)
}

export function getPropDef(comp: DiyComponent | undefined, key: string): ComponentProp | undefined {
  return comp?.props?.find(p => p.key === key)
}

export function getDefaultConfig(code: string): Record<string, any> {
  const comp = getComponentByCode(code)
  if (!comp) return {}
  const cfg: Record<string, any> = {}
  comp.props?.forEach(p => { cfg[p.key] = p.default })
  return cfg
}
