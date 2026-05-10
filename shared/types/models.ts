/**
 * 共享数据模型类型 — 前后端共同引用
 * 所有类型与数据库 Schema (schema.sql) 严格对齐
 * 列名: create_time / update_time (非 created_at / updated_at)
 * 状态码: TINYINT 数字 (非字符串枚举)
 */

// ========== 用户体系 ==========

export interface User {
  id: number
  username: string
  nickname: string
  phone: string
  email: string
  role: 'user' | 'admin' | 'super_admin'
  avatar: string
  status: 0 | 1           // 0=禁用 1=正常
  last_login_time: string | null
  create_time: string
  update_time: string
}

// ========== 会员体系 ==========

/** membership_plan 表对齐 schema.sql:252-272 */
export interface MembershipPlan {
  id: number
  plan_type: 0 | 1 | 2 | 3   // 0=免费 1=月卡 2=季卡 3=年卡
  name: string
  price: number
  original_price: number
  credits: number
  daily_credits: number
  save_days: number
  watermark_free: 0 | 1
  hd_export: 0 | 1
  brand_kit: 0 | 1
  batch_limit: number
  priority_queue: 0 | 1
  status: 0 | 1              // 0=禁用 1=启用
  sort_order: number
  create_time: string
  update_time: string
}

/** user_membership 表对齐 schema.sql:54-72 */
export interface UserMembership {
  id: number
  user_id: number
  plan_type: 0 | 1 | 2 | 3   // 0=免费 1=月卡 2=季卡 3=年卡
  status: 0 | 1 | 2          // 0=已取消 1=生效中 2=已到期
  trial_quota: number
  trial_used: number
  credit_balance: number
  start_time: string
  end_time: string | null
  auto_renew: 0 | 1
  create_time: string
  update_time: string
}

// ========== 支付体系 ==========

/** payment_order 表对齐 schema.sql:369-381 */
export interface PaymentOrder {
  id: string                 // VARCHAR(50) 订单ID
  user_id: number
  plan_type: 1 | 2 | 3      // 套餐类型 (支付订单不包含免费)
  plan_name: string
  amount: number
  paid: 0 | 1               // 0=未付 1=已付
  paid_at: string | null
  create_time: string
}

// ========== 消费记录 ==========

/** consumption_record 表对齐 schema.sql:130-145 */
export type ConsumptionType = 1 | 2 | 3  // 1=试用 2=会员扣点 3=充值

export interface ConsumptionRecord {
  id: number
  user_id: number
  type: ConsumptionType
  action: string
  credit_before: number
  credit_after: number
  consumed: number
  remark: string
  task_id: string
  create_time: string
}

// ========== 积分体系 ==========

export interface UserCredit {
  id: number
  user_id: number
  credit_balance: number
  create_time: string
  update_time: string
}

// ========== 任务体系 ==========

/** task 表 status: 0=排队 1=处理中 2=已完成 3=失败 4=已取消 */
export type TaskStatus = 0 | 1 | 2 | 3 | 4

/** task 表 priority: 1=正常 2=优先 3=夜间批量 */
export type TaskPriority = 1 | 2 | 3

export interface Task {
  id: number | string
  user_id: number
  task_type: string
  task_params: Record<string, unknown> | null
  status: TaskStatus
  priority: TaskPriority
  progress: number
  result_data: Record<string, unknown> | null
  error_msg: string | null
  retry_count: number
  max_retries: number
  completed_at: string | null
  create_time: string
  update_time: string
}

// ========== 徽章体系 ==========

export interface Badge {
  id: number
  name: string
  description: string | null
  icon: string | null
  condition_json: string | null
  create_time: string
}

// ========== 配置体系 ==========

export interface SiteConfig {
  id: number
  config_key: string
  config_value: string
  description: string | null
  create_time: string
  update_time: string
}

export interface SysConfig {
  id: number
  config_key: string
  config_value: string
  description: string | null
  create_time: string
  update_time: string
}
