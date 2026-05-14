// person-replace 页面配置 — Pattern: Dual upload + Option cards
import type { PageConfig } from '../pipeline/types'

export const personReplaceConfig: PageConfig = {
  id: 'person-replace',
  title: 'work_pages.person_replace.title',
  subtitle: 'work_pages.person_replace.subtitle',

  steps: [
    {
      type: 'input',
      fields: [
        {
          type: 'image-upload', key: 'modelImage', label: 'work_pages.person_replace.model_label',
          hint: 'work_pages.person_replace.model_hint', required: true,
          upload: { accept: 'image/*', maxSizeMB: 20, maxCount: 1, multiple: false },
        },
        {
          type: 'image-upload', key: 'clothingImage', label: 'work_pages.person_replace.clothing_label',
          hint: 'work_pages.person_replace.clothing_hint', required: true,
          upload: { accept: 'image/*', maxSizeMB: 20, maxCount: 1, multiple: false },
        },
      ],
    },
    {
      type: 'configure',
      fields: [{
        type: 'option-cards', key: 'mode', label: 'work_pages.person_replace.mode_title',
        default: 'auto',
        options: [
          { label: 'work_pages.person_replace.mode_auto', value: 'auto' },
          { label: 'work_pages.person_replace.mode_precise', value: 'precise' },
        ],
      }],
    },
    { type: 'progress' },
    { type: 'result' },
  ],

  api: {
    submitUrl: '/api/images/batch-replace', submitMethod: 'POST',
    pollUrlTemplate: '/api/job/{taskId}', cost: 5,
  },

  ui: {
    stepLabels: [
      'work_pages.person_replace.step_upload',
      'work_pages.person_replace.step_config',
      'work_pages.person_replace.step_process',
      'work_pages.person_replace.step_result',
    ],
    uploadIcon: '👤',
    resultMode: 'before-after',
  },
}
