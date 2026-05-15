/**
 * ADK 服务 — Skill 惰性加载 + 自动抽象 + 强制执行
 *
 * 借鉴 OpenClaw 三级加载 + HERMES 技能闭环模式：
 *   L1: 技能自动抽象 — 任务 ≥5 工具调用后自动生成 .skill 文件
 *   L2: FTS5 混合检索 — 快速规则层跳过无关技能，0 Token 浪费
 *   L3: 技能强制执行 — 关键业务场景 verifySkillCompliance() 门禁
 *
 * 工作原理：
 *   1. 启动时扫描 skills/ 目录 → 建立索引 (tags + keywords)
 *   2. 每次 Agent 运行时，L2 快速规则先判断是否加载
 *   3. 仅将匹配的 Skill 注入 Prompt
 *   4. 执行后 L1 自动抽象高频工具调用为技能
 *   5. 关键业务 L3 门禁校验必需技能
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

// ========== L2: 快速规则层 — 0 Token 跳过 ==========

/** 无需技能注入的输入模式：打招呼/简单问答/单字 */
const SKIP_PATTERNS = [
  /^(你好|hi|hello|hey|您好|嗨|哈喽)\b/i,
  /^(谢谢|thanks|thank you|多谢|感谢|3Q)\b/i,
  /^(好的|ok|okay|行|可以|嗯|对|是的|没错)\b/i,
  /^(再见|bye|拜拜|晚安|明天见)\b/i,
  /^(在吗|在不在|有人吗|hello\?)\b/i,
];

const SKIP_MAX_LENGTH = 12; // ≤12 字符且无业务关键词直接跳过

/** 业务关键词：命中任一则即使很短也必须加载技能 */
const BUSINESS_KEYWORDS = [
  '生成', '图片', '视频', '文案', '脚本', '分镜', '配音',
  '支付', '退款', '订单', '佣金', '分账', '代理', '企业',
  '白底', '扩图', '爆款', '投流', '广告', '详情页', '翻译',
  '安全', '审计', 'SQL', '漏洞', 'XSS', '注入', '限流',
  'sql', 'xss', 'csrf', 'auth', 'token', 'jwt', 'injection',
];

/**
 * L2 快速判定：输入是否需要技能注入
 * @param {string} taskDescription
 * @returns {boolean} true = 跳过技能加载，0 Token
 */
export function shouldSkipSkills(taskDescription) {
  if (!taskDescription) return true;

  const trimmed = taskDescription.trim();

  // 空输入
  if (trimmed.length === 0) return true;

  // 匹配跳过模式
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // 短输入且无业务关键词
  if (trimmed.length <= SKIP_MAX_LENGTH) {
    const hasBusinessKeyword = BUSINESS_KEYWORDS.some(kw =>
      trimmed.toLowerCase().includes(kw.toLowerCase())
    );
    if (!hasBusinessKeyword) return true;
  }

  return false;
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

  // L2 快速门禁：打招呼/简单问答直接跳过，0 Token
  if (shouldSkipSkills(taskDescription)) {
    return [];
  }

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

  // L3: 关键业务门禁 — 强制补全缺失技能
  const { missing } = verifySkillCompliance(taskDescription, skills.map(s => s.name));
  let allSkills = skills;
  if (missing.length > 0) {
    const forced = forceLoadRequiredSkills(missing);
    allSkills = [...skills, ...forced];
  }

  if (allSkills.length === 0) return baseSystemPrompt;

  const skillBlocks = allSkills.map(s => [
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

// ========== L1: 技能自动抽象 ==========

const SKILL_ABSTRACTION_THRESHOLD = 5; // ≥5 次工具调用触发自动抽象

/** @type {Map<string, number>} 任务模式 → 工具调用累计计数 */
const _toolCallLedger = new Map();

/**
 * L1: 记录任务工具调用，≥阈值时自动生成技能文件
 * @param {string} taskPattern 任务模式标识（如 "白底图生成"）
 * @param {number} toolCallCount 本次执行工具调用次数
 * @param {{ description?: string, tags?: string[], promptSnippet?: string }} meta
 * @returns {{ abstracted: boolean, skillName?: string }}
 */
export async function autoAbstractSkill(taskPattern, toolCallCount, meta = {}) {
  const key = taskPattern.toLowerCase().trim();

  if (!_toolCallLedger.has(key)) {
    _toolCallLedger.set(key, 0);
  }
  const total = _toolCallLedger.get(key) + toolCallCount;
  _toolCallLedger.set(key, total);

  if (total < SKILL_ABSTRACTION_THRESHOLD) {
    return { abstracted: false };
  }

  // 达到阈值：自动生成 .skill 文件
  const skillName = key.replace(/[\s/\\]/g, '-').replace(/[^\w\u4e00-\u9fff-]/g, '');
  const filePath = path.join(SKILLS_DIR, `${skillName}.md`);

  // 已存在则跳过
  if (fs.existsSync(filePath)) {
    return { abstracted: false, skillName };
  }

  const description = meta.description || `${taskPattern} 自动化技能`;
  const tags = meta.tags || ['auto-generated'];
  const body = meta.promptSnippet || `# ${taskPattern}\n\n自动从 ${total} 次工具调用中抽象的技能。`;

  const content = [
    '---',
    `name: ${skillName}`,
    `description: "${description}"`,
    `autoTags: [${tags.join(', ')}]`,
    '---',
    '',
    body,
  ].join('\n');

  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    logger.info(`[SkillLoader] L1 auto-abstracted: ${skillName} (${total} tool calls) → ${filePath}`);

    // 刷新索引使新技能立即可用
    _toolCallLedger.set(key, 0);
    refreshSkillIndex();

    return { abstracted: true, skillName };
  } catch (err) {
    logger.warn(`[SkillLoader] L1 auto-abstract failed for ${skillName}:`, err.message);
    return { abstracted: false };
  }
}

/**
 * L1: 获取当前工具调用累计计数（供监控面板读取）
 */
export function getAbstractionLedger() {
  const result = {};
  for (const [k, v] of _toolCallLedger) {
    result[k] = { count: v, threshold: SKILL_ABSTRACTION_THRESHOLD, pct: ((v / SKILL_ABSTRACTION_THRESHOLD) * 100).toFixed(0) + '%' };
  }
  return result;
}

// ========== L3: 技能强制执行 ==========

/**
 * L3: 关键业务场景 → 必需技能映射
 * 门禁规则：若场景命中，requiredSkills 必须全部已加载，否则拒绝执行
 */
const SCENARIO_REQUIRED_SKILLS = {
  'payment': ['security-audit-enhanced'],
  '支付': ['security-audit-enhanced'],
  '退款': ['security-audit-enhanced'],
  'generate': ['code-reviewer-enhanced'],
  '生成': ['code-reviewer-enhanced'],
  'deploy': ['performance-profiler'],
  '部署': ['performance-profiler'],
  'migration': ['security-audit-enhanced'],
  '迁移': ['security-audit-enhanced'],
  '生产': ['security-audit-enhanced'],
};

/**
 * L3: 验证当前已加载技能是否覆盖场景要求
 * @param {string} taskDescription 任务描述
 * @param {string[]} loadedSkillNames 已加载的技能名称列表
 * @returns {{ compliant: boolean, missing: string[], required: string[] }}
 */
export function verifySkillCompliance(taskDescription, loadedSkillNames = []) {
  const taskLower = taskDescription.toLowerCase();
  const required = [];

  for (const [keyword, skills] of Object.entries(SCENARIO_REQUIRED_SKILLS)) {
    if (taskLower.includes(keyword)) {
      required.push(...skills);
    }
  }

  if (required.length === 0) {
    return { compliant: true, missing: [], required: [] };
  }

  const loadedSet = new Set(loadedSkillNames.map(n => n.toLowerCase()));
  const missing = [...new Set(required)].filter(s => !loadedSet.has(s.toLowerCase()));

  if (missing.length > 0) {
    logger.warn(`[SkillLoader] L3 compliance FAIL: "${taskDescription.slice(0, 60)}" missing [${missing.join(', ')}]`);
  }

  return {
    compliant: missing.length === 0,
    missing,
    required: [...new Set(required)],
  };
}

/**
 * L3: 强制注入缺失的必需技能（直接读取文件，不依赖匹配分数）
 * @param {string[]} missingSkills 缺失的技能名称列表
 * @returns {Array<{name: string, description: string, content: string}>}
 */
export function forceLoadRequiredSkills(missingSkills) {
  const registry = buildIndex();
  const results = [];

  for (const name of missingSkills) {
    const skill = registry.get(name);
    if (skill) {
      results.push({ name: skill.name, description: skill.description, content: skill.content.slice(0, 500) });
    }
  }

  if (results.length > 0) {
    logger.info(`[SkillLoader] L3 forced-load: [${results.map(s => s.name).join(', ')}]`);
  }

  return results;
}

export default {
  loadRelevantSkills,
  augmentSystemPrompt,
  refreshSkillIndex,
  shouldSkipSkills,
  autoAbstractSkill,
  getAbstractionLedger,
  verifySkillCompliance,
  forceLoadRequiredSkills,
};
