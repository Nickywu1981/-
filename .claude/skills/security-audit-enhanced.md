---
name: security-audit-enhanced
description: Enhanced security auditor — OWASP Top 10 + npm audit + CSP headers + JWT fail-closed + rate limiting
type: skill
source: community-import
---

# Enhanced Security Auditor

> 从社区 Skill 导入并增强。覆盖 OWASP Top 10 + 项目特定的安全架构。

## TRIGGER
当用户请求 "security audit"、"安全审计"、"安全检查"、或提交涉及 auth/路由/中间件的 PR 前。

## 检测清单

### Auth & JWT
- [ ] JWT 使用 RS256 (非 HS256) 或已明确选用 HS256
- [ ] JWT 过期时间 < 24h，refresh token < 30d
- [ ] 密码使用 bcrypt/scrypt/argon2 (非 SHA/MD5)
- [ ] 无硬编码 JWT secret (使用 `JWT_PORTAL_SECRET` 等 env var)

### Rate Limiting
- [ ] 所有 API 路由有 `rateLimiter` 中间件
- [ ] 登录/注册/支付端点有严格限流 (5/min)
- [ ] 限流使用 Redis 分布式计数器 (非内存)

### CSP & Headers
- [ ] `Content-Security-Policy` header 已设置
- [ ] 无 `unsafe-inline` (除非明确需要)
- [ ] `X-Frame-Options: DENY` 已设置
- [ ] `X-Content-Type-Options: nosniff` 已设置

### Input Validation
- [ ] 所有 POST/PUT/PATCH 请求有 Zod schema
- [ ] 文件上传有大小/类型限制
- [ ] 无直接使用 `req.body` / `req.query` / `req.params` 而不做类型校验

### Dependency Audit
- [ ] `npm audit` 无 CRITICAL/HIGH 漏洞
- [ ] 无 deprecated 包
- [ ] 无超过 365 天未更新的核心依赖

## 验收标准
- [ ] 所有 High/Critical 项已修复或标注豁免原因
- [ ] `npm audit --production` 输出零 CRITICAL
- [ ] 中间件链顺序正确 (auth → rateLimit → validate → controller)
- [ ] CSP header 无 unsafe-inline (除非文档化原因)
