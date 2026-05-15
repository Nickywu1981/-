---
name: performance-profiler
description: Performance analysis — Lighthouse scores, Webpack bundle size, DB slow queries, API response times
type: skill
source: community-import
---

# Performance Profiler

> 前端性能 + 后端慢查询 + 打包体积三合一分析。

## TRIGGER
当用户请求 "性能分析"、"performance check"、"慢查询"、"bundle size"、或发现 API 响应 >1s 时。

## 分析维度

### 1. 前端性能 (Lighthouse/PageSpeed)
- 检查 TTI (Time to Interactive) < 3s
- 检查 LCP (Largest Contentful Paint) < 2.5s
- 检查 CLS (Cumulative Layout Shift) < 0.1
- 检查图片是否使用 WebP/AVIF + 懒加载
- 检查是否有未压缩的 JS/CSS

### 2. 打包体积 (Webpack/Vite)
- `ls -lh client/.output/public/_nuxt/*.js | sort -k5 -h` → Top 10 大文件
- 检查是否有重复打包的库（如 lodash 两次引入）
- 检查 tree-shaking 是否生效

### 3. 后端慢查询 (DB)
- 检查 `EXPLAIN` 执行计划
- 识别 `SELECT *` 全表扫描
- 识别 JOIN 无索引的列
- 建议添加 `CREATE INDEX` 的命令

### 4. API 响应时间
- 检查是否有 N+1 查询
- 检查是否有同步阻塞操作（应在 BullMQ 异步化）
- 检查 middleware 链中的重复校验

## 验收标准
- [ ] Lighthouse score > 80 (Performance)
- [ ] 最大 chunk < 500KB (gzip 后 < 100KB)
- [ ] 零 DB 全表扫描（已加索引或显式 LIMIT）
- [ ] API P95 响应时间 < 500ms
