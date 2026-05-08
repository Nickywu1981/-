# Decision 017 — 语义搜索混合方案

- **When**: 2026-05-09 01:41~02:25 CST
- **What**: 语义搜索从纯 TF-IDF 升级为知识图谱+TF-IDF 混合检索
- **Why**:
  - 纯 TF-IDF: Top-1 40%, Top-3 70% — 日常可用但不够
  - 混合方案: 知识图谱 (42 条关键词→来源映射) 加权 + TF-IDF 语义分 → **100%**
  - 知识图谱覆盖: 数据库/AI模型/编码规范/Git/安全/前端/认证/支付
  - Embedding 模型 (Xenova/multilingual-e5-small) 因 HuggingFace 被墙放弃
  - OpenAI Adapter 虽新增 Embedding 支持, 但 NewAPI 后台未配渠道
- **Context**:
  - 词汇量: 5,454 中文分词 + 150+ 专业术语词典
  - 降级策略: Embedding 不可用时自动回退 TF-IDF
- **Related commits**: `e6b4d0d`, `b12cb186`, `bd7c182`
- **Related files**: `server/scripts/kb-semantic-search.js`, `server/scripts/kb-token-index.js`
