/**
 * API 请求/响应类型 — 前后端契约
 */

import type {
  User, UserProfile, MembershipPlan, UserMembership,
  PaymentOrder, PaymentNotifyLog, ConsumptionRecord,
  UserCredit, Task, Badge, SiteConfig, SysConfig,
  PayChannel, OrderType,
} from './models'

// ========== 通用响应 ==========

export interface ApiSuccess<T = unknown> {
  code: 200
  msg: string
  data: T
}

export interface ApiError {
  code: number
  msg: string
  data: null
}

export interface PaginatedData<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

// ========== 认证接口 ==========

export interface RegisterInput {
  username: string
  password: string
  email?: string
  phone?: string
}

export interface LoginInput {
  phone?: string
  email?: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string  // access token
}

// ========== 用户接口 ==========

export interface UpdateProfileInput {
  avatar?: string
  email?: string
  phone?: string
}

// ========== 会员接口 ==========

export interface CreateMembershipOrderInput {
  planType: 1 | 2 | 3
  payChannel?: PayChannel
}

export interface MembershipOrderData {
  reqsn: string
  payUrl: string
  amount: number
  planName: string
}

// ========== 支付接口 ==========

export interface CreatePaymentInput {
  orderType: OrderType
  businessId?: number
  amount: number
  payChannel?: PayChannel
  body?: string
  remark?: string
}

export interface PaymentResultData {
  reqsn: string
  payUrl: string
  amount: number
  status: number
}

export interface PaymentNotifyData {
  reqsn: string
  trxid: string
  trxstatus: string
  amount: number
  sign: string
  [key: string]: string
}

// ========== 任务接口 ==========

export interface CreateTaskInput {
  title: string
  description?: string
  priority?: number
  due_date?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: string
  priority?: number
  due_date?: string
}

export interface TaskListParams {
  page?: number
  pageSize?: number
  status?: string
  priority?: number
}

// ========== 分页参数 ==========

export interface PaginationParams {
  page?: number
  pageSize?: number
}

// ========== 错误码枚举 ==========

export const ErrorCode = {
  // 通用
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL: 500,

  // 业务错误 (4xxx)
  USER_EXISTS: 4001,
  USER_NOT_FOUND: 4002,
  INVALID_PASSWORD: 4003,
  TOKEN_EXPIRED: 4004,
  TOKEN_INVALID: 4005,

  // 支付错误 (41xx)
  PAYMENT_CREATE_FAILED: 4101,
  PAYMENT_NOT_FOUND: 4102,
  PAYMENT_CALLBACK_FAILED: 4103,
  PAYMENT_DUPLICATE: 4104,

  // 会员错误 (42xx)
  MEMBERSHIP_NOT_FOUND: 4201,
  MEMBERSHIP_EXPIRED: 4202,
  PLAN_NOT_FOUND: 4203,

  // 积分错误 (43xx)
  CREDIT_INSUFFICIENT: 4301,

  // 参数校验 (49xx)
  VALIDATION_ERROR: 4901,
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]
