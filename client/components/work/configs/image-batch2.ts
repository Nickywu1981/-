// ── Batch 2: Image upload + Style → Before/After or Single Image ──
import type { PageConfig } from '../pipeline/types'

function dualResultPage(id: string, titleKey: string, apiUrl: string, icon: string, extraCfg?: Partial<PageConfig>): PageConfig {
  return {
    id, title: titleKey,
    steps: [
      {
        type: 'input',
        fields: [{
          type: 'image-upload', key: 'image', label: `${titleKey}.drop_title`,
          hint: `${titleKey}.drop_hint`, required: true,
          upload: { accept: 'image/*', maxSizeMB: 20, maxCount: 1, multiple: false },
        }],
      },
      { type: 'progress' },
      { type: 'result' },
    ],
    api: { submitUrl: apiUrl, submitMethod: 'POST', pollUrlTemplate: '/api/job/{taskId}', cost: 3 },
    ui: {
      stepLabels: [`${titleKey}.step_upload`, `${titleKey}.step_process`, `${titleKey}.step_download`],
      uploadIcon: icon,
      resultMode: 'before-after',
    },
    ...extraCfg,
  }
}

export const swapFaceConfig = dualResultPage('swap-face', 'work_pages.swap_face', '/api/images/generate', '😊')
export const modelGenerateConfig = dualResultPage('model-generate', 'work_pages.model_generate', '/api/model/generate', '🤖')
export const viralCloneConfig = dualResultPage('viral-clone', 'work_pages.viral_clone', '/api/videos/viral/replicate', '🔄', {
  subtitle: 'work_pages.viral_clone.subtitle',
})
export const viralReplicateConfig = dualResultPage('viral-replicate', 'work_pages.viral_replicate', '/api/videos/viral/replicate', '📋', {
  subtitle: 'work_pages.viral_replicate_subtitle',
})
export const platformDetailConfig = dualResultPage('platform-detail', 'work_pages.platform_detail', '/api/detail/generate-set', '📱')
export const posterConfig = dualResultPage('poster', 'work_pages.poster', '/api/posters/generate', '📜', {
  subtitle: 'work_pages.poster.subtitle',
  ui: { stepLabels: ['work_pages.poster.step_upload', 'work_pages.poster.step_process', 'work_pages.poster.step_download'], uploadIcon: '📜', resultMode: 'single-image' },
})
export const colorSwapConfig = dualResultPage('color-swap', 'work_pages.color_swap', '/api/images/generate', '🎨')
