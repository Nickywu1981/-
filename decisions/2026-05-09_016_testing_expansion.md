# Decision 016 — 测试全面扩展

- **When**: 2026-05-09 00:50~02:21 CST
- **What**: 单元测试从 158 用例扩展到全栈覆盖:
  - complianceService (20 用例)
  - tierService (7 用例)
  - composables: usePermission/intentRouter (30 用例)
  - 客户端核心: stores/composables/utils (37 用例)
  - 租户过滤 + 注入检测 (50 用例)
  - 平台规格 (14 用例) + RBAC (41 用例)
  - 模型调度器评分/排名/聚合 (32 用例)
  - 契约测试 9/9 + Cookie 鉴权 + 共享类型
  - 多语言服务 (18 用例)
  - 提示词引擎 + 文案平台规则 + DIY 状态机
- **Why**: 测试是第一道质量防线, 80%+ 覆盖率是生产上线的硬门槛
- **Context**: 最终达 29 个测试文件, 全部通过
- **Related commits**: `cb42c3e`~`a96f3e7` (10+ commits)
- **Related files**: `server/src/__tests__/`, `client/__tests__/`
