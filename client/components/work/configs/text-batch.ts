// ── Batch 3: Text input + Style → Text/Image result ──
import type { PageConfig } from '../pipeline/types'

function textToResultPage(id: string, titleKey: string, apiUrl: string, icon: string, styleOptions: { label: string; value: string; icon?: string }[], resultMode: PageConfig['ui']['resultMode'] = 'text', subtitleKey?: string): PageConfig {
  return {
    id, title: titleKey,
    ...(subtitleKey ? { subtitle: subtitleKey } : {}),
    steps: [
      {
        type: 'input',
        fields: [{
          type: 'textarea', key: 'prompt', label: `${titleKey}.input_label`,
          placeholder: `${titleKey}.input_placeholder`, required: true,
          validation: { maxLength: 5000 },
        }],
      },
      {
        type: 'configure',
        fields: [{
          type: styleOptions[0]?.icon ? 'style-chips' : 'option-cards',
          key: 'style', label: `${titleKey}.style_title`,
          default: styleOptions[0]?.value,
          options: styleOptions,
        }],
      },
      { type: 'progress' },
      { type: 'result' },
    ],
    api: { submitUrl: apiUrl, submitMethod: 'POST', pollUrlTemplate: '/api/job/{taskId}' },
    ui: {
      stepLabels: [`${titleKey}.step_input`, `${titleKey}.step_style`, `${titleKey}.step_process`, `${titleKey}.step_result`],
      resultMode,
    },
  }
}

export const scriptGenConfig = textToResultPage('script-gen', 'work_pages.script_gen', '/api/copywriting/script', '📝', [
  { label: 'work_pages.script_gen.style_sales', value: 'sales', icon: '💰' },
  { label: 'work_pages.script_gen.style_story', value: 'story', icon: '📖' },
  { label: 'work_pages.script_gen.style_review', value: 'review', icon: '⭐' },
])

export const shotPlanConfig = textToResultPage('shot-plan', 'work_pages.shot_plan', '/api/videos/storyboard', '🎬', [
  { label: 'work_pages.shot_plan.style_studio', value: 'studio' },
  { label: 'work_pages.shot_plan.style_outdoor', value: 'outdoor' },
  { label: 'work_pages.shot_plan.style_mixed', value: 'mixed' },
])

export const shotPanoramaConfig = textToResultPage('shot-panorama', 'work_pages.shot_panorama', '/api/images/generate', '🌄', [
  { label: 'work_pages.shot_panorama.style_wide', value: 'wide' },
  { label: 'work_pages.shot_panorama.style_ultra', value: 'ultra' },
])

export const promptHubConfig = textToResultPage('prompt-hub', 'work_pages.prompt_hub', '/api/prompts/templates', '💡', [
  { label: 'work_pages.prompt_hub.cat_product', value: 'product' },
  { label: 'work_pages.prompt_hub.cat_scene', value: 'scene' },
  { label: 'work_pages.prompt_hub.cat_model', value: 'model' },
], 'text', 'work_pages.prompt_hub.subtitle')

export const voiceGenConfig = textToResultPage('voice-gen', 'work_pages.voice_gen', '/api/voice/generate', '🎙️', [
  { label: 'work_pages.voice_gen.gender_male', value: 'male', icon: '👨' },
  { label: 'work_pages.voice_gen.gender_female', value: 'female', icon: '👩' },
], 'download', 'work_pages.voice_gen_subtitle')
