// white-bg 页面配置 — Pattern: Image upload + Option cards + Single image result
import type { PageConfig } from '../pipeline/types'

export const whiteBgConfig: PageConfig = {
  id: 'white-bg',
  title: 'work_pages.white_bg.title',

  steps: [
    {
      type: 'input',
      fields: [{
        type: 'image-upload', key: 'image', label: 'work_pages.white_bg.drop_title',
        hint: 'work_pages.white_bg.drop_hint', required: true,
        upload: { accept: 'image/*', maxSizeMB: 20, maxCount: 1, multiple: false },
      }],
    },
    {
      type: 'configure',
      fields: [{
        type: 'option-cards', key: 'bgType', label: 'work_pages.white_bg.bg_title',
        default: 'pure-white',
        options: [
          { label: 'work_pages.white_bg.pure_white', value: 'pure-white' },
          { label: 'work_pages.white_bg.natural_light', value: 'natural-light' },
          { label: 'work_pages.white_bg.studio', value: 'studio' },
        ],
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
      'work_pages.white_bg.step_upload',
      'work_pages.white_bg.step_bg',
      'work_pages.white_bg.step_process',
      'work_pages.white_bg.step_download',
    ],
    uploadIcon: '⬜',
    resultMode: 'before-after',
  },
}
