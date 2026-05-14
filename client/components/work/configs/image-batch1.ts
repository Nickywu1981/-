// ── Batch 1: Image upload + Style/Option chips → Single image ──
// 以下 12 个页面共享同一模式，按 API 端点区分

import type { PageConfig } from '../pipeline/types'

function imageToImagePage(id: string, titleKey: string, apiUrl: string, icon: string, styleOptions?: { label: string; value: string; icon?: string }[], subtitleKey?: string): PageConfig {
  const steps: PageConfig['steps'] = [
    {
      type: 'input',
      fields: [{
        type: 'image-upload', key: 'image', label: `${titleKey}.drop_title`,
        hint: `${titleKey}.drop_hint`, required: true,
        upload: { accept: 'image/*', maxSizeMB: 20, maxCount: 1, multiple: false },
      }],
    },
  ]

  if (styleOptions && styleOptions.length > 0) {
    steps.push({
      type: 'configure',
      fields: [{
        type: styleOptions[0].icon ? 'style-chips' : 'option-cards',
        key: 'style', label: `${titleKey}.style_title`,
        default: styleOptions[0].value,
        options: styleOptions,
      }],
    })
  }

  steps.push({ type: 'progress' }, { type: 'result' })

  return {
    id, title: titleKey,
    ...(subtitleKey ? { subtitle: subtitleKey } : {}),
    steps,
    api: { submitUrl: apiUrl, submitMethod: 'POST', pollUrlTemplate: '/api/job/{taskId}', cost: 2 },
    ui: {
      stepLabels: [`${titleKey}.step_upload`, `${titleKey}.step_config`, `${titleKey}.step_process`, `${titleKey}.step_download`],
      uploadIcon: icon,
      resultMode: styleOptions ? 'single-image' : 'before-after',
    },
  }
}

// ── 风格迁移 ──
export const styleTransferConfig = imageToImagePage('style-transfer', 'work_pages.style_transfer', '/api/images/generate', '🎨', [
  { label: 'work_pages.style_transfer.style_anime', value: 'anime', icon: '🎨' },
  { label: 'work_pages.style_transfer.style_oil', value: 'oil', icon: '🖼️' },
  { label: 'work_pages.style_transfer.style_watercolor', value: 'watercolor', icon: '💧' },
  { label: 'work_pages.style_transfer.style_sketch', value: 'sketch', icon: '✏️' },
  { label: 'work_pages.style_transfer.style_cartoon', value: 'cartoon', icon: '🐱' },
])

export const textEffectConfig = imageToImagePage('text-effect', 'work_pages.text_effect', '/api/images/generate', '✨', [
  { label: 'work_pages.text_effect.style_neon', value: 'neon', icon: '💡' },
  { label: 'work_pages.text_effect.style_metallic', value: 'metallic', icon: '🔩' },
  { label: 'work_pages.text_effect.style_3d', value: '3d', icon: '📦' },
])

export const translateImageConfig = imageToImagePage('translate-image', 'work_pages.translate_image', '/api/images/generate', '🌐', [
  { label: 'work_pages.translate_image.lang_en', value: 'en' },
  { label: 'work_pages.translate_image.lang_ja', value: 'ja' },
  { label: 'work_pages.translate_image.lang_ko', value: 'ko' },
])

export const imageTranslateConfig = imageToImagePage('image-translate', 'work_pages.image_translate', '/api/images/generate', '🔤', [
  { label: 'work_pages.image_translate.lang_en', value: 'en' },
  { label: 'work_pages.image_translate.lang_ja', value: 'ja' },
])

export const outpaintConfig = imageToImagePage('outpaint', 'work_pages.outpaint', '/api/images/generate', '🔲', [
  { label: 'work_pages.outpaint.ratio_1_1', value: '1:1' },
  { label: 'work_pages.outpaint.ratio_16_9', value: '16:9' },
  { label: 'work_pages.outpaint.ratio_9_16', value: '9:16' },
], 'work_pages.outpainting.subtitle')

export const retouchConfig = imageToImagePage('retouch', 'work_pages.retouch', '/api/images/generate', '💄', [
  { label: 'work_pages.retouch.mode_auto', value: 'auto' },
  { label: 'work_pages.retouch.mode_portrait', value: 'portrait' },
  { label: 'work_pages.retouch.mode_product', value: 'product' },
], 'work_pages.retouch_subtitle')

export const sceneConfig = imageToImagePage('scene', 'work_pages.scene', '/api/images/generate', '🏞️', [
  { label: 'work_pages.scene.indoor', value: 'indoor' },
  { label: 'work_pages.scene.outdoor', value: 'outdoor' },
  { label: 'work_pages.scene.studio', value: 'studio' },
])

export const wrinkleRemoveConfig = imageToImagePage('wrinkle-remove', 'work_pages.wrinkle_remove', '/api/images/generate', '👕', [
  { label: 'work_pages.wrinkle_remove.mode_light', value: 'light' },
  { label: 'work_pages.wrinkle_remove.mode_heavy', value: 'heavy' },
])

export const ghostMannequinConfig = imageToImagePage('ghost-mannequin', 'work_pages.ghost_mannequin', '/api/images/generate', '👻', [
  { label: 'work_pages.ghost_mannequin.mode_3d', value: '3d' },
  { label: 'work_pages.ghost_mannequin.mode_flat', value: 'flat' },
], 'work_pages.ghost_mannequin_subtitle')

export const virtualTryonConfig = imageToImagePage('virtual-tryon', 'work_pages.virtual_tryon', '/api/images/generate', '👗', [
  { label: 'work_pages.virtual_tryon.gender_female', value: 'female' },
  { label: 'work_pages.virtual_tryon.gender_male', value: 'male' },
])

export const mainImageConfig = imageToImagePage('main-image', 'work_pages.main_image', '/api/images/replicate', '🖼️', [
  { label: 'work_pages.main_image.platform_taobao', value: 'taobao' },
  { label: 'work_pages.main_image.platform_jd', value: 'jd' },
  { label: 'work_pages.main_image.platform_amazon', value: 'amazon' },
])

export const productRenderConfig = imageToImagePage('product-render', 'work_pages.product_render', '/api/render/product', '📦', [
  { label: 'work_pages.product_render.angle_front', value: 'front' },
  { label: 'work_pages.product_render.angle_45', value: '45deg' },
  { label: 'work_pages.product_render.angle_side', value: 'side' },
], 'work_pages.product_render.subtitle')
