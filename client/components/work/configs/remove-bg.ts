// remove-bg 页面配置
// G4 Frontend-A | 从 285 行 .vue 迁移为纯配置
import type { PageConfig } from '../pipeline/types'

export const removeBgConfig: PageConfig = {
  id: 'remove-bg',
  title: 'work_pages.remove_bg_title',
  subtitle: 'work_pages.remove_bg_subtitle',

  steps: [
    {
      type: 'input',
      title: 'work_pages.remove_bg_step_upload',
      fields: [
        {
          type: 'image-upload',
          key: 'image',
          label: 'work_pages.remove_bg_drop_text',
          hint: 'work_pages.remove_bg_drop_hint',
          required: true,
          upload: {
            accept: 'image/*',
            maxSizeMB: 20,
            maxCount: 1,
            multiple: false,
          },
        },
      ],
    },
    {
      type: 'configure',
      title: 'work_pages.remove_bg_step_bg',
      fields: [
        {
          type: 'bg-grid',
          key: 'bgType',
          label: 'work_pages.remove_bg_bg_title',
          required: true,
          default: 'transparent',
          options: [
            {
              label: 'work_pages.remove_bg_bg_transparent',
              value: 'transparent',
              css: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%) 0 0 / 20px 20px, #fff',
              badge: 'work_pages.remove_bg_recommended',
            },
            { label: 'work_pages.remove_bg_bg_white', value: 'white', css: '#ffffff' },
            { label: 'work_pages.remove_bg_bg_gray', value: 'gray', css: '#e5e7eb' },
          ],
        },
      ],
    },
    { type: 'progress' },
    { type: 'result' },
  ],

  api: {
    submitUrl: '/api/background-removal/remove',
    submitMethod: 'POST',
    pollUrlTemplate: '/api/job/{taskId}',
    pollIntervalMs: 2000,
    cost: 2,
  },

  ui: {
    stepLabels: [
      'work_pages.remove_bg_step_upload',
      'work_pages.remove_bg_step_bg',
      'work_pages.remove_bg_step_process',
      'work_pages.remove_bg_step_download',
    ],
    uploadIcon: '🖼️',
    resultMode: 'before-after',
  },
}
