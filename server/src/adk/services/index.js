/**
 * ADK 服务层索引
 *
 * 借鉴 OpenClaw 的三项增强：
 *   1. Context Compaction — 上下文压缩（记忆巩固）
 *   2. Skill Lazy Loading    — Skill 按需注入 Prompt
 *   3. Agent Message Bus     — Agent-to-Agent 直接消息通信
 */
export { compactContext } from './contextCompactionService.js';
export { loadRelevantSkills, augmentSystemPrompt, refreshSkillIndex } from './skillLoaderService.js';
export { injectA2A, agentMessageBus } from './agentMessageBus.js';
export { recordTask, queryRecentTasks } from '../../services/recentTaskService.js';
