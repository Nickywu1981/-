// ── Batch 5: Simple config/form pages (no upload, just settings or actions) ──
import type { PageConfig } from '../pipeline/types'

export const brandSettingsConfig: PageConfig = {
  id: 'brand-settings',
  title: 'work_pages.brand_settings.title',
  steps: [
    {
      type: 'input',
      fields: [
        { type: 'image-upload', key: 'logo', label: 'work_pages.brand_settings.logo_label', upload: { accept: 'image/*', maxSizeMB: 5, maxCount: 1 } },
        { type: 'textarea', key: 'brandName', label: 'work_pages.brand_settings.name_label', validation: { maxLength: 100 } },
      ],
    },
    { type: 'progress' },
    { type: 'result' },
  ],
  api: { submitUrl: '/api/brand', submitMethod: 'PUT' },
  ui: { stepLabels: ['work_pages.brand_settings.step_input', 'work_pages.brand_settings.step_save', 'work_pages.brand_settings.step_done'], resultMode: 'download' },
}

export const sizeTemplatesConfig: PageConfig = {
  id: 'size-templates',
  title: 'work_pages.size_templates.title',
  steps: [
    {
      type: 'configure',
      fields: [
        { type: 'select', key: 'platform', label: 'work_pages.size_templates.platform_label', default: 'taobao',
          options: [
            { label: 'work_pages.size_templates.platform_taobao', value: 'taobao' }, { label: 'work_pages.size_templates.platform_jd', value: 'jd' },
            { label: 'work_pages.size_templates.platform_pdd', value: 'pdd' }, { label: 'work_pages.size_templates.platform_amazon', value: 'amazon' },
          ],
        },
        { type: 'select', key: 'category', label: 'work_pages.size_templates.category_label', default: 'main_image',
          options: [
            { label: 'work_pages.size_templates.cat_main', value: 'main_image' },
            { label: 'work_pages.size_templates.cat_detail', value: 'detail' },
            { label: 'work_pages.size_templates.cat_banner', value: 'banner' },
          ],
        },
      ],
    },
    { type: 'result' },
  ],
  api: { submitUrl: '/api/templates/platforms', submitMethod: 'GET' },
  ui: { stepLabels: ['work_pages.size_templates.step_select', 'work_pages.size_templates.step_result'], resultMode: 'text' },
}

export const diyPagesConfig: PageConfig = {
  id: 'diy-pages',
  title: 'work_pages.diy_pages.title',
  steps: [
    {
      type: 'configure',
      fields: [
        { type: 'option-cards', key: 'template', label: 'work_pages.diy_pages.template_label', default: 'product',
          options: [
            { label: 'work_pages.diy_pages.tmpl_product', value: 'product' },
            { label: 'work_pages.diy_pages.tmpl_promo', value: 'promo' },
            { label: 'work_pages.diy_pages.tmpl_brand', value: 'brand' },
          ],
        },
      ],
    },
    { type: 'progress' },
    { type: 'result' },
  ],
  api: { submitUrl: '/api/diy', submitMethod: 'POST' },
  ui: { stepLabels: ['work_pages.diy_pages.step_select', 'work_pages.diy_pages.step_generate', 'work_pages.diy_pages.step_done'], resultMode: 'download' },
}

export const outputConfig: PageConfig = {
  id: 'output', title: 'work_pages.output.title',
  steps: [
    { type: 'configure', fields: [] },
    { type: 'result' },
  ],
  api: { submitUrl: '/api/images/works', submitMethod: 'GET' },
  ui: { stepLabels: ['work_pages.output.step_list', 'work_pages.output.step_detail'], resultMode: 'image-grid' },
}

export const usageConfig: PageConfig = {
  id: 'usage', title: 'work_pages.usage.title',
  steps: [
    { type: 'configure', fields: [
      { type: 'select', key: 'period', label: 'work_pages.usage.period_label', default: 'month',
        options: [
          { label: 'work_pages.usage.period_today', value: 'today' },
          { label: 'work_pages.usage.period_week', value: 'week' },
          { label: 'work_pages.usage.period_month', value: 'month' },
        ],
      },
    ]},
    { type: 'result' },
  ],
  api: { submitUrl: '/api/points/account', submitMethod: 'GET' },
  ui: { stepLabels: ['work_pages.usage.step_filter', 'work_pages.usage.step_view'], resultMode: 'text' },
}

export const detailH5Config: PageConfig = {
  id: 'detail-h5', title: 'work_pages.detail_h5.title',
  steps: [
    { type: 'input', fields: [
      { type: 'textarea', key: 'content', label: 'work_pages.detail_h5.content_label', placeholder: 'work_pages.detail_h5.content_placeholder', validation: { maxLength: 10000 } },
    ]},
    { type: 'configure', fields: [
      { type: 'style-chips', key: 'template', label: 'work_pages.detail_h5.template_label', default: 'modern',
        options: [
          { label: 'work_pages.detail_h5.style_modern', value: 'modern', icon: '✨' },
          { label: 'work_pages.detail_h5.style_minimal', value: 'minimal', icon: '⬜' },
          { label: 'work_pages.detail_h5.style_brand', value: 'brand', icon: '🏷️' },
        ],
      },
    ]},
    { type: 'progress' },
    { type: 'result' },
  ],
  api: { submitUrl: '/api/detail/long-image', submitMethod: 'POST', pollUrlTemplate: '/api/job/{taskId}' },
  ui: { stepLabels: ['work_pages.detail_h5.step_input', 'work_pages.detail_h5.step_style', 'work_pages.detail_h5.step_generate', 'work_pages.detail_h5.step_done'], resultMode: 'download' },
}

export const distributionConfig: PageConfig = {
  id: 'distribution', title: 'work_pages.distribution.title',
  steps: [
    { type: 'configure', fields: [
      { type: 'option-cards', key: 'type', label: 'work_pages.distribution.type_label', default: 'share',
        options: [
          { label: 'work_pages.distribution.type_share', value: 'share' },
          { label: 'work_pages.distribution.type_affiliate', value: 'affiliate' },
        ],
      },
    ]},
    { type: 'result' },
  ],
  api: { submitUrl: '/api/distribution/stats', submitMethod: 'GET' },
  ui: { stepLabels: ['work_pages.distribution.step_type', 'work_pages.distribution.step_result'], resultMode: 'text' },
}

export const complianceCheckConfig: PageConfig = {
  id: 'compliance-check', title: 'work_pages.compliance_check.title',
  steps: [
    { type: 'input', fields: [
      { type: 'image-upload', key: 'image', label: 'work_pages.compliance_check.upload_label', upload: { accept: 'image/*', maxSizeMB: 20 } },
      { type: 'textarea', key: 'text', label: 'work_pages.compliance_check.text_label', validation: { maxLength: 2000 } },
    ]},
    { type: 'progress' },
    { type: 'result' },
  ],
  api: { submitUrl: '/api/compliance/check', submitMethod: 'POST', pollUrlTemplate: '/api/job/{taskId}' },
  ui: { stepLabels: ['work_pages.compliance_check.step_input', 'work_pages.compliance_check.step_check', 'work_pages.compliance_check.step_report'], resultMode: 'text' },
}
