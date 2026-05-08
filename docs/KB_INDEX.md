# Movio AI — 知识库总索引

> **自动更新** | PostToolUse Hook 触发 | `npm run kb:snapshot`
> **最后更新**: 2026-05-08

---

## 📖 知识库地图

| 分区 | 文件 | 存什么 | 更新方式 |
|:--:|------|------|:--:|
| **WHY** | `KB_DECISIONS.md` | 架构决策/技术选型/否决方案 | 手动（重大决策时） |
| **INDEX** | `KB_INDEX.md` | 本文件：总索引 | 随文档增删手动更新 |
| **WHAT** | `docs/PRD_*.md` | 产品需求文档 | Product-Manager |
| | `docs/TASK_*.md` | 任务总清单 | Orchestrator |
| | `docs/DB_*.md` | 数据库与接口设计 | Backend-B |
| | `docs/UI_*.md` | UI 设计规范 | UI-Designer |
| | `docs/ARCH_*.md` | 架构规划文档 | Architect |
| | `CLAUDE.md` | 开发规则与规范 | Architect + Rules-Keeper |
| **NOW** | `docs/KB_SNAPSHOT.md` | 项目实时全景快照 | **自动** (kb:snapshot) |

---

## 🔗 项目核心文档

### 产品与规划
- [PRD 产品需求文档](PRD_Movio_AI_产品需求文档.md)
- [任务总清单](TASK_任务总清单.md)
- [项目规整规划文档](Movio_AI_项目规整规划文档.md)
- [13人6岗编制方案](Movio_AI_13人6岗编制方案.md)

### 技术设计
- [数据库与接口设计](DB_Movio_AI_数据库与接口设计.md)
- [UI 设计规范](UI_Movio_AI_设计规范.md)
- [完善方案 28 项](..%E5%AD%98%E6%A1%A3%E6%96%87%E4%BB%B6/Movio_AI_%E5%AE%8C%E5%96%84%E6%96%B9%E6%A1%88.md)

### 规则与规范
- [CLAUDE.md](..%2FCLAUDE.md) — 19章开发规则
- [Memory 索引](..%2F..\\Users\\MyPC\\.claude\\projects\\I---------\\memory\MEMORY.md) — 17条记忆文件

### 实时状态
- [KB_SNAPSHOT 项目快照](KB_SNAPSHOT.md) — **自动生成**

---

## 🔄 自动维护机制

```
git commit → PostToolUse Hook
     ↓
npm run kb:snapshot
     ↓
覆写 KB_SNAPSHOT.md (实时数据)
     ↓
Hook 输出 systemMessage → AI 检查差异
     ↓
差异 > 阈值 → AI 自动更新 CLAUDE.md + KB_INDEX.md
```
