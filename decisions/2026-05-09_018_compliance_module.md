# Decision 018 — 合规检查模块

- **When**: 2026-05-09 00:50~00:56 CST
- **What**: 合规检查模块: content moderation + 平台规则校验
- **Why**:
  - 电商内容有严格的平台审核规则 (违禁词/敏感图/夸大宣传)
  - 自动检测+阻断: 在发布前拦截不合规内容
  - 多平台规则差异大 (淘宝 vs 抖音 vs Amazon)
- **Context**:
  - GET /targets: 列出可用的合规检测目标
  - POST /check: 执行合规检测
  - 20 个单元测试覆盖合规服务
- **Related commits**: `cb42c3e`, `0d9a64d`, `ccddeec`
- **Related files**: `server/src/services/complianceService.js`
