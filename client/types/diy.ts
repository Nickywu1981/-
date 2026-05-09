/** DIY 页面搭建器 — 核心类型定义 */

export interface ComponentProp {
  key: string
  label: string
  type: 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'color' | 'image' | 'datetime'
  default?: string | number | boolean
  options?: (string | number)[]
  step?: number
  show?: (cfg: Record<string, any>) => boolean
}

export interface DiyComponent {
  component_code: string
  name: string
  category: string
  icon?: string
  thumbnail?: string
  default_config: Record<string, any>
  props: ComponentProp[]
}

export interface DiyComponentCategory {
  key: string
  label: string
  icon?: string
}

export interface DiySectionConfig {
  [key: string]: any
}

export interface DiySection {
  id: string
  component: string
  config: DiySectionConfig
  locked?: boolean
  hidden?: boolean
  _style?: Record<string, any>
}

export interface DiyPage {
  id: number
  title: string
  slug: string
  page_type: 'mobile' | 'pc' | 'h5'
  status: number
  tenant_id: number
  config_json?: { sections: DiySection[] }
  description?: string
  is_published?: boolean
  created_at?: string
  updated_at?: string
  update_time?: string
}

export interface DiyTemplate {
  id: number
  title: string
  industry: string
  page_type: string
  thumbnail?: string
  description?: string
  tags?: string
  use_count: number
  is_official: boolean
  create_time?: string
  mobile_config?: { sections: DiySection[] }
  pc_config?: { sections: DiySection[] }
}

export interface DiyVersion {
  version: number
  page_id: number
  config_json: { sections: DiySection[] }
  remark?: string
  created_at: string
}

export interface CardItem {
  id: string
  category: string
  icon: string
  title: string
  desc: string
  route: string
  order: number
  visible: boolean
}

export interface NavItem {
  path: string
  icon: string
  label: string
  disabled: boolean
  order?: number
}
