// ── Batch 4: Media upload + Config → Video/Audio result ──
import type { PageConfig } from '../pipeline/types'

function mediaToMediaPage(id: string, titleKey: string, apiUrl: string, icon: string, acceptType: 'image/*' | 'video/*', opts?: Partial<PageConfig>): PageConfig {
  return {
    id, title: titleKey,
    steps: [
      {
        type: 'input',
        fields: [{
          type: acceptType === 'video/*' ? 'video-upload' : 'image-upload',
          key: 'media', label: `${titleKey}.upload_label`,
          hint: `${titleKey}.upload_hint`, required: true,
          upload: { accept: acceptType, maxSizeMB: acceptType === 'video/*' ? 200 : 20, maxCount: 1, multiple: false },
        }],
      },
      { type: 'progress' },
      { type: 'result' },
    ],
    api: { submitUrl: apiUrl, submitMethod: 'POST', pollUrlTemplate: '/api/job/{taskId}', cost: 5 },
    ui: {
      stepLabels: [`${titleKey}.step_upload`, `${titleKey}.step_process`, `${titleKey}.step_result`],
      uploadIcon: icon,
      resultMode: 'download',
    },
    ...opts,
  }
}

export const videoEditConfig = mediaToMediaPage('video-edit', 'work_pages.video_edit', '/api/videos/smart-clip', '✂️', 'video/*', {
  api: { submitUrl: '/api/videos/smart-clip', submitMethod: 'POST', pollUrlTemplate: '/api/job/{taskId}', cost: 10 },
  ui: { resultMode: 'video' },
})

export const videoTranslateConfig = mediaToMediaPage('video-translate', 'work_pages.video_translate', '/api/video-translate/subtitles', '🌐', 'video/*', {
  api: { submitUrl: '/api/video-translate/subtitles', submitMethod: 'POST', pollUrlTemplate: '/api/job/{taskId}', cost: 8 },
  ui: { resultMode: 'video' },
})

export const digitalHumanConfig = mediaToMediaPage('digital-human', 'work_pages.digital_human', '/api/digital-human/create', '🤖', 'image/*', {
  ui: { stepLabels: ['work_pages.digital_human.step_upload', 'work_pages.digital_human.step_process', 'work_pages.digital_human.step_result'], uploadIcon: '🤖', resultMode: 'video' },
  api: { submitUrl: '/api/digital-human/create', submitMethod: 'POST', pollUrlTemplate: '/api/job/{taskId}', cost: 15 },
})

export const voiceCloneConfig = mediaToMediaPage('voice-clone', 'work_pages.voice_clone', '/api/voice/clone', '🎤', 'audio/*', {
  subtitle: 'work_pages.voice_clone.subtitle',
  api: { submitUrl: '/api/voice/clone', submitMethod: 'POST', pollUrlTemplate: '/api/job/{taskId}', cost: 8 },
  ui: { stepLabels: ['work_pages.voice_clone.step_upload', 'work_pages.voice_clone.step_process', 'work_pages.voice_clone.step_result'], uploadIcon: '🎤', resultMode: 'download' },
})
