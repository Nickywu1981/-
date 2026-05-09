/**
 * 业务领域状态常量 — 消除魔术数字
 * 所有服务层必须使用这些常量替代裸数字比较
 */

// ========== 用户状态 ==========

export const USER_STATUS = {
  DISABLED: 0,
  ACTIVE: 1,
};

// ========== 订单/支付状态 ==========

export const ORDER_STATUS = {
  PENDING: 0,
  PAID: 1,
  CLOSED: 2,
};

// ========== 充值支付状态 ==========

export const RECHARGE_PAY_STATUS = {
  UNPAID: 0,
  PAID: 1,
};

// ========== 积分消费记录状态 ==========

export const CREDIT_RECORD_STATUS = {
  PENDING: 0,
  CONFIRMED: 1,
  ROLLED_BACK: 2,
};

// ========== DIY 页面状态 ==========

export const DIY_PAGE_STATUS = {
  DRAFT: 0,
  PUBLISHED: 1,
  OFFLINE: 2,
  TRASH: 3,
};

export const DIY_PAGE_STATUS_LABEL = {
  [DIY_PAGE_STATUS.DRAFT]: '草稿',
  [DIY_PAGE_STATUS.PUBLISHED]: '已发布',
  [DIY_PAGE_STATUS.OFFLINE]: '已下线',
  [DIY_PAGE_STATUS.TRASH]: '回收站',
};

// ========== 批量任务状态 ==========

export const BATCH_TASK_STATUS = {
  PENDING: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  FAILED: 3,
};

// ========== 代理/上游开关标志 ==========

export const PROXY_FLAG = {
  OFF: 0,
  ON: 1,
};

// 熔断器状态别名
export const CIRCUIT_STATUS = {
  CLOSED: 0,
  OPEN: 1,
};

// ========== 表单访问类型 ==========

export const FORM_ACCESS_TYPE = {
  PRIVATE: 0,
  PUBLIC: 1,
};

// ========== 会员计划类型 ==========

export const PLAN_TYPE = {
  FREE: 0,
  MONTHLY: 1,
  QUARTERLY: 2,
  YEARLY: 3,
};

// ========== Prompt 模板状态 ==========

export const PROMPT_STATUS = {
  DRAFT: 0,
  PENDING_REVIEW: 1,
  PUBLISHED: 2,
  REJECTED: 3,
};
