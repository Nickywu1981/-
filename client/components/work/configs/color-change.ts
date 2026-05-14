// color-change 页面配置 — Pattern: Image upload + Color picker + Single image result
import type { PageConfig } from '../pipeline/types'

export const colorChangeConfig: PageConfig = {
  id: 'color-change',
  title: 'work_pages.color_change.title',

  steps: [
    {
      type: 'input',
      fields: [{
        type: 'image-upload', key: 'image', label: 'work_pages.color_change.drop_title',
        hint: 'work_pages.color_change.drop_hint', required: true,
        upload: { accept: 'image/*', maxSizeMB: 20, maxCount: 1, multiple: false },
      }],
    },
    {
      type: 'configure',
      fields: [{
        type: 'color-picker', key: 'targetColor', label: 'work_pages.color_change.select_color',
        default: '#7C3AED',
      }],
    },
    { type: 'progress' },
    { type: 'result' },
  ],

  api: {
    submitUrl: '/api/images/generate', submitMethod: 'POST',
    pollUrlTemplate: '/api/job/{taskId}', cost: 2,
  },

  ui: {
    stepLabels: [
      'work_pages.color_change.step_upload',
      'work_pages.color_change.step_color',
      'work_pages.color_change.step_process',
      'work_pages.color_change.step_result',
    ],
    uploadIcon: '🎨',
    resultMode: 'single-image',
  },
}
