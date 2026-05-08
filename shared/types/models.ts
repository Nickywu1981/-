/**
 * 共享数据模型类型 — 前后端共同引用
 * 所有类型与数据库 Schema 严格对齐
 */

// ========== 用户体系 ==========

export interface User {
  id: number
  username: string
  email: string | null
  phone: string | null
  avatar: string | null
  role: 'user' | 'admin'
  status: 0 | 1  // 0=禁用 1=正常
  created_at: string
  updated_at: string
}

export interface UserProfile extends User {
  member?: UserMembership | null
  credits: number
}

// ========== 会员体系 ==========

export interface MembershipPlan {
  id: number
  name: string
  plan_type: 1 | 2 | 3  // 1=月卡 2=季卡 3=年卡
  price: number
  duration_days: number
  description: string | null
  status: 0 | 1
  created_at: string
  updated_at: string
}

export interface UserMembership {
  id: number
  user_id: number
  plan_id: number
  plan_name: string
  plan_type: 1 | 2 | 3
  status: 0 | 1  // 0=过期 1=有效
  start_time: string
  end_time: string
  created_at: string
  updated_at: string
}

// ========== 支付体系 ==========

export type PayChannel = 'wechat' | 'alipay' | 'unionpay'
export type OrderStatus = 0 | 1 | 2  // 0=待支付 1=已支付 2=已关闭
export type OrderType = 'membership' | 'credits' | 'other'

export interface PaymentOrder {
  id: number
  reqsn: string
  trxid: string | null
  user_id: number
  order_type: OrderType
  business_id: number | null
  amount: number
  pay_channel: PayChannel | null
  status: OrderStatus
  body: string | null
  remark: string | null
  created_at: string
  updated_at: string
}

export interface PaymentNotifyLog {
  id: number
  reqsn: string
  raw_body: string
  verified: 0 | 1
  processed: 0 | 1
  error_msg: string | null
  created_at: string
}

// ========== 消费记录 ==========

export type ConsumptionType = 'membership' | 'credits' | 'task' | 'other'

export interface ConsumptionRecord {
  id: number
  user_id: number
  type: ConsumptionType
  amount: number
  balance_after: number
  description: string | null
  created_at: string
}

// ========== 积分体系 ==========

export interface UserCredit {
  id: number
  user_id: number
  credit_balance: number
  created_at: string
  updated_at: string
}

// ========== 任务体系 ==========

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 0 | 1 | 2 | 3  // 0=无 1=低 2=中 3=高

export interface Task {
  id: number
  user_id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  created_at: string
  updated_at: string
}

// ========== 徽章体系 ==========

export interface Badge {
  id: number
  name: string
  description: string | null
  icon: string | null
  condition: string | null
  created_at: string
}

// ========== 配置体系 ==========

export interface SiteConfig {
  id: number
  config_key: string
  config_value: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface SysConfig {
  id: number
  config_key: string
  config_value: string
  description: string | null
  created_at: string
  updated_at: string
}
