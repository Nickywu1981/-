---
name: OpenAI兼容图片API规范参考
description: ToAPIs/第三方聚合平台 OpenAI 兼容图片生成 API 规范对比分析
type: reference
---

# OpenAI 兼容图片生成 API — 差异分析与接入方案

> 来源: 用户提供的 ToAPIs API 规范文档 (2026-05-12)
> 目的: 接入第三方聚合平台模型池时的路径/参数转译参考

## 端点映射

| 外部规范 (OpenAI 兼容) | Movio 内部路由 | 转译要点 |
|------|------|------|
| `POST /v1/uploads/images` | `POST /api/v4/upload/simple` | 路径改写, 认证转换 (Bearer → JWT) |
| `POST /v1/images/generations/async` | `POST /api/v4/image/generate` | 参数名映射, 新增 resolution 字段 |
| `GET /v1/images/generations/async/{id}` | `GET /api/v4/job/:id` | 路径改写, 返回结构包装 |

## 参数映射

| 外部参数 | 内部参数 | 处理逻辑 |
|------|------|------|
| `model` (默认 gpt-image-2) | `model` | 直通, 或映射到内部模型名 |
| `prompt` | `prompt` | 直通 |
| `size` ("16:9") | `size` | 直通 |
| `resolution` ("1K"/"2K"/"4K") | **新增字段** | 映射到对应的宽高尺寸 |
| `n` | `n` | 直通 |
| `reference_images` | `reference_images` | 转发到 /replicate 逻辑 |
| `response_format` | 忽略 | 固定返回 URL |

## 认证转换

外部: `Authorization: Bearer sk-xxx` (API Key)
内部: JWT Cookie
转换: 在适配层用 openApiKey 验证后签发临时 JWT 或走内部服务调用

## 缺失能力

1. **resolution 参数** — 内部 imageService 需新增 1K/2K/4K 分辨率支持
2. **progress 字段** — 任务状态返回需补 0-100 进度
3. **response_format** — 可忽略, 始终返回 URL

## 实施建议

**优先级: 低 (有需求时再做)**
在 `server/src/route/openApiRoutes.js` 中新增 `/v1/` 前缀的 OpenAI 兼容路由组,
内部转译到现有 v4 控制器, 对下游零侵入。

**Why:** 接入第三方模型池时的前置条件。当前 Movio 直连 OpenAI, 暂无需此层。
**How to apply:** 当需要接入 ToAPIs 等聚合平台或对外提供 OpenAI 兼容 API 时, 按此映射实施。
