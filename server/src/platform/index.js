/**
 * Platform — 统一中台层入口
 *
 * 四层架构 - 中台层:
 * - authCenter:       统一认证中心 (JWT/多端隔离/黑名单)
 * - rbacEngine:       权限引擎 (角色+权限点+中间件工厂)
 * - auditTrail:       审计日志 (结构化记录+查询)
 * - configCenter:     配置中心 (合并双系统+分级权限)
 * - notificationHub:  通知中心 (站内信/SMS/邮件/WebSocket)
 * - modelGateway:     AI模型网关 (注册/调度/熔断/降级)
 */
export * from './authCenter.js';
export * from './rbacEngine.js';
export * from './auditTrail.js';
export * from './configCenter.js';
export * from './notificationHub.js';
export * from './modelGateway.js';
