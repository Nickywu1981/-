// storyboard 页面配置 — Pattern: Text input + Style chips + Text result
import type { PageConfig } from '../pipeline/types'

export const storyboardConfig: PageConfig = {
  id: 'storyboard',
  title: 'work_pages.storyboard_title',
  subtitle: 'work_pages.storyboard_subtitle',

  steps: [
    {
      type: 'input',
      fields: [{
        type: 'textarea', key: 'script', label: 'work_pages.storyboard_script_title',
        placeholder: 'work_pages.storyboard_script_placeholder',
        required: true,
        validation: { maxLength: 5000 },
      }],
    },
    {
      type: 'configure',
      fields: [{
        type: 'style-chips', key: 'style', label: 'work_pages.storyboard_style_title',
        default: 'modern',
        options: [
          { label: 'work_pages.storyboard_style_modern', value: 'modern', icon: '🏠' },
          { label: 'work_pages.storyboard_style_cinematic', value: 'cinematic', icon: '🎬' },
          { label: 'work_pages.storyboard_style_anime', value: 'anime', icon: '🎨' },
          { label: 'work_pages.storyboard_style_realistic', value: 'realistic', icon: '📷' },
          { label: 'work_pages.storyboard_style_minimal', value: 'minimal', icon: '⬜' },
        ],
      }],
    },
    { type: 'progress' },
    { type: 'result' },
  ],

  api: {
    submitUrl: '/api/videos/storyboard', submitMethod: 'POST',
    pollUrlTemplate: '/api/job/{taskId}',
  },

  ui: {
    stepLabels: [
      'work_pages.storyboard_step_input',
      'work_pages.storyboard_step_style',
      'work_pages.storyboard_step_process',
      'work_pages.storyboard_step_result',
    ],
    resultMode: 'text',
  },
}
