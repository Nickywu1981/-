---
decision: 双路径架构 — 确定性走Token Index，模糊走Semantic Search
date: 2026-05-09
id: 021
status: confirmed
---

## What

记忆检索采用双路径架构：

- **Token Index**：精确匹配，1,757 Token × 12 类型，查得到就一定对，查不到就一定不存在
- **Semantic Search**：TF-IDF + 知识图谱混合，5,446 词汇 × 216 块 × 27 文档，用于模糊上下文检索

## Why

深度测试 182 用例证明：
- Token Index 100% 精确/召回/零误报 — 确定性场景无替代方案
- Semantic Search 50-90%（因查询类型而异）— 语义搜索永远做不到 100%
- 两者互补覆盖全场景：确定性问题走 Token，模糊问题走 Semantic
- 无关查询拦截 100%（零噪音），不会把无关内容推给用户

## How to apply

```
"userController 在哪个文件" → Token Index (100%)
"users 表有哪些字段"       → Token Index (100%)
"之前怎么处理支付的"        → Semantic Search (~50-90%)
"项目用的什么技术栈"        → Semantic Search (~50-90%)
"今天天气真好"             → 无关拦截 (score=0, 不返回)
```

## Upgrade path

Semantic Search 升级到 embedding 模型（需 NewAPI 后台加渠道）→ 预估 Top-3 从 55% 提升到 85-90%
