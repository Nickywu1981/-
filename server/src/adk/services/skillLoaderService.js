/**
 * ADK 服务 — Skill 惰性加载
 *
 * 借鉴 OpenClaw 的三级加载设计：
 *   不再全量注入 Skill 到 Prompt，而是按任务上下文按需选取相关 Skill。
 *   节省 60-90% Skill 相关的 Prompt Token。
 *
 * 工作原理：
 *   1. 启动时扫描 skills/ 目录 → 建立索引 (tags + keywords)
 *   2. 每次 Agent 运行时，根据 userInput 匹配相关 Skill
 *   3. 仅将匹配的 Skill 注入 Prompt
 */
import fs from 'fs';
import path from 'path';
import logger from '../../utils/logger.js';

const SKILLS_DIR = path.resolve('.claude/skills');

/** @type {Map<string, {name: string, description: string, tags: string[], content: string}>} */
let _registry = null;

/**
 * 构建 Skill 索引
 * 扫描 .claude/skills/*.md，解析 frontmatter
 */
function buildIndex() {
  if (_registry) return _registry;

  _registry = new Map();

  if (!fs.existsSync(SKILLS_DIR)) {
    logger.warn('[SkillLoader] No skills directory found:', SKILLS_DIR);
    return _registry;
  }

  const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md') && f !== 'INDEX.md');

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(SKILLS_DIR, file), 'utf-8');
      const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);

      if (!fmMatch) continue;

      const fm = {};
      for (const line of fmMatch[1].split('\n')) {
        const m = line.match(/^(\w+):\s*(.+)$/);
        if (m) fm[m[1]] = m[2].trim().replace(/^"|"$/g, '');
      }

      const name = fm.name || file.replace('.md', '');
      const description = fm.description || '';
      const tags = fm.autoTags
        ? fm.autoTags.replace(/[\[\]]/g, '').split(',').map(t => t.trim())
        : [];
      const body = raw.replace(/^---[\s\S]*?---\n?/, '').trim();

      _registry.set(name, { name, description, tags, content: body, file });
    } catch (err) {
      logger.warn(`[SkillLoader] Failed to parse ${file}:`, err.message);
    }
  }

  logger.info(`[SkillLoader] Indexed ${_registry.size} skills`);
  return _registry;
}

/**
 * 按任务上下文匹配相关 Skill（关键词匹配 + 标签匹配）
 * @param {string} taskDescription 用户输入或任务描述
 * @param {{ maxSkills?: number }} opts
 * @returns {Array<{name: string, description: string, content: string}>}
 */
export function loadRelevantSkills(taskDescription, opts = {}) {
  const { maxSkills = 3 } = opts;
  const registry = buildIndex();

  if (registry.size === 0) return [];

  const taskLower = taskDescription.toLowerCase();
  const scored = [];

  // 关键词 → 标签映射
  const keywordTagMap = {
    'sql': 'sql', 'injection': 'security', 'xss': 'security', 'auth': 'security',
    'security': 'security', 'secure': 'security', 'audit': 'security',
    'i18n': 'i18n', 'translate': 'i18n', 'locale': 'i18n', '国际化': 'i18n',
    'performance': 'performance', 'perf': 'performance', 'slow': 'performance',
    'lighthouse': 'performance', 'bundle': 'performance', '性能': 'performance',
    'test': 'test', 'testing': 'test', 'spec': 'test', '测试': 'test',
    'review': 'review', 'code review': 'review', '审查': 'review',
    'refactor': 'review', 'clean': 'review', 'dead code': 'review',
  };

  for (const [name, skill] of registry) {
    let score = 0;

    // 标签匹配
    for (const [keyword, tag] of Object.entries(keywordTagMap)) {
      if (taskLower.includes(keyword) && skill.tags.includes(tag)) {
        score += 3;
      }
    }

    // 名称/描述关键词直接匹配
    for (const word of taskLower.split(/\s+/)) {
      if (skill.name.includes(word) || skill.description.toLowerCase().includes(word)) {
        score += 2;
      }
    }

    // 中文关键词匹配
    for (const keyword of ['安全', '性能', '测试', '翻译', '审查', '注入', '死代码']) {
      if (taskLower.includes(keyword) && skill.content.includes(keyword)) {
        score += 1;
      }
    }

    if (score > 0) {
      scored.push({ name, description: skill.description, content: skill.content, score });
    }
  }

  // 按分数降序，取 top N
  scored.sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, maxSkills);
  if (selected.length > 0) {
    logger.debug(`[SkillLoader] Matched ${selected.length} skills for task: "${taskDescription.slice(0, 50)}..."`);
  }

  return selected.map(({ name, description, content }) => ({ name, description, content }));
}

/**
 * 将匹配的 Skill 注入到系统 Prompt 中
 * @param {string} taskDescription
 * @param {string} baseSystemPrompt
 * @returns {string} 增强后的 system prompt
 */
export function augmentSystemPrompt(taskDescription, baseSystemPrompt = '') {
  const skills = loadRelevantSkills(taskDescription);

  if (skills.length === 0) return baseSystemPrompt;

  const skillBlocks = skills.map(s => [
    `## Skill: ${s.name}`,
    s.content.slice(0, 500), // 截断过长 skill
  ].join('\n'));

  return [
    baseSystemPrompt,
    '',
    '---',
    '## Active Skills (lazy-loaded for this task)',
    ...skillBlocks,
  ].join('\n');
}

/** 强制刷新索引（skills 目录变更后调用） */
export function refreshSkillIndex() {
  _registry = null;
  return buildIndex();
}

export default { loadRelevantSkills, augmentSystemPrompt, refreshSkillIndex };
