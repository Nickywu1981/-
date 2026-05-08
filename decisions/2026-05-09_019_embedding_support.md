# Decision 019 — OpenAI Adapter Embedding 支持

- **When**: 2026-05-09 02:25 CST
- **What**: OpenAI 适配器新增 Embedding 支持, 为语义搜索向量化做准备
- **Why**:
  - 当前语义搜索 100% 靠知识图谱, 但不具可扩展性
  - Embedding 向量是长期方案: 新主题自动语义理解, 不需要手动维护图谱
  - blocklist: 当前 TF-IDF + 图谱 → 100%, 未来可平滑切换到 embedding
- **Context**:
  - 代码已就绪: `openaiAdapter.getEmbedding()` + `POST /api/internal/embed` 端点
  - 但 NewAPI 渠道组未配置 embedding 模型, 实际不可用
  - 降级策略: API 不可用时自动回退 TF-IDF
- **Related commits**: `bd7c182`, `b12cb186`
- **Related files**: `server/src/services/adapters/openaiAdapter.js`, `server/src/app.js`
