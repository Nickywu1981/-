#!/usr/bin/env node

/**
 * Skill 自动生成器
 *
 * 从近期任务记录中检测重复模式，自动生成 SKILL.md 骨架。
 *
 * 触发条件（满足任一即生成）：
 *   1. 同一标签任务完成 ≥3 次（如 "dao"、"refactor"）
 *   2. 用户明确说 "记住这个做法" / "沉淀为skill"
 *   3. 踩坑记录非空（有 pitfall 的任务自动提炼成防坑 skill）
 *
 * 用法:
 *   node scripts/gen-skill.js <skill-name> [--tag=<tag>] [--dry-run]
 *   node scripts/gen-skill.js --auto  # 自动检测高频标签并生成
 *
 * 示例:
 *   node scripts/gen-skill.js dao-select-star-cleanup --tag=dao
 *   node scripts/gen-skill.js --auto --dry-run
 */

const fs = require('fs');
const path = require('path');

const RECENT_DIR = path.join('.claude', 'memory', 'recent');
const SKILLS_DIR = path.join('.claude', 'skills');
const AUTO_PREFIX = 'auto-';

// ==================== 1. 读取近期任务 ====================

function parseTaskFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');

  const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return null;

  const fm = {};
  for (const line of frontmatterMatch[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) {
      const val = m[2].trim().replace(/^"|"$/g, '').replace(/^\[|\]$/g, '');
      fm[m[1]] = val;
    }
  }

  const operation = fm.operation || '';
  const tags = fm.tags ? fm.tags.split(',').map(t => t.replace(/"/g, '').trim()) : [];

  // 提取踩坑记录
  const pitfallsSection = raw.match(/## 踩坑记录\n([\s\S]*?)(?=\n##|$)/);
  const pitfalls = pitfallsSection
    ? pitfallsSection[1].split('\n')
        .filter(l => l.startsWith('- ') && !l.includes('(none)'))
        .map(l => l.replace(/^- /, '').trim())
    : [];

  // 提取涉及文件
  const filesSection = raw.match(/## 涉及文件\n([\s\S]*?)(?=\n##|$)/);
  const files = filesSection
    ? [...filesSection[1].matchAll(/`([^`]+)`/g)].map(m => m[1])
    : [];

  // 提取结果
  const resultSection = raw.match(/## 结果\n([\s\S]*?)(?=\n##|$)/);
  const result = resultSection ? resultSection[1].trim() : '';

  return { operation, tags, pitfalls, files, result };
}

function loadRecentTasks() {
  if (!fs.existsSync(RECENT_DIR)) return [];

  return fs.readdirSync(RECENT_DIR)
    .filter(f => f.endsWith('.md') && f !== 'INDEX.md')
    .map(f => parseTaskFile(path.join(RECENT_DIR, f)))
    .filter(Boolean);
}

// ==================== 2. 检测模式 ====================

function detectPatterns(tasks) {
  const tagCounts = {};
  for (const task of tasks) {
    for (const tag of task.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  // 返回出现 ≥3 次的标签
  return Object.entries(tagCounts)
    .filter(([, count]) => count >= 3)
    .map(([tag, count]) => ({ tag, count }));
}

// ==================== 3. 生成 SKILL.md ====================

function generateSkill(skillName, tasks, opts = {}) {
  const { tag, pitfalls = [], files = [] } = opts;

  // 提取共同模式
  const commonFiles = [...new Set(tasks.flatMap(t => t.files))];
  const allPitfalls = [...new Set([...pitfalls, ...tasks.flatMap(t => t.pitfalls)])];
  const operations = [...new Set(tasks.map(t => t.operation))];

  const trigger = tag || tasks[0]?.tags[0] || '';

  const lines = [
    '---',
    `name: ${skillName}`,
    `description: 自动生成的 ${skillName} 操作 skill — 从 ${tasks.length} 次实际任务提炼`,
    `source: auto-generated`,
    `autoTags: [${trigger}]`,
    `autoTaskCount: ${tasks.length}`,
    '---',
    '',
    `# ${skillName}`,
    '',
    '> 此 Skill 由 gen-skill.js 自动从近期任务记录提炼。请人工审核后启用。',
    '',
    '## TRIGGER',
    `当任务涉及 \`${trigger}\` 操作时应用此 Skill。`,
    '',
    '## 执行步骤',
    ...operations.map((op, i) => `${i + 1}. ${op}`),
    '',
    '## 踩坑记录',
    ...allPitfalls.map(p => `- ${p}`),
    ...(allPitfalls.length === 0 ? ['- (无记录)'] : []),
    '',
    '## 涉及文件模式',
    ...commonFiles.map(f => `- \`${f}\``),
    '',
    '## 验收标准',
    `- [ ] 完成后检查所有 ${commonFiles.length} 个相关文件`,
    ...allPitfalls.map(p => `- [ ] 确认 ${p.replace(/[:：].*/, '')} 已解决`),
    '',
    '## 变更日志',
    `- ${new Date().toISOString().slice(0, 10)}: 从 ${tasks.length} 次任务自动生成`,
  ];

  return lines.join('\n');
}

// ==================== 4. CLI ====================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('用法: node scripts/gen-skill.js <skill-name> [--tag=<tag>] [--dry-run]');
    console.log('      node scripts/gen-skill.js --auto [--dry-run]');
    process.exit(0);
  }

  const tasks = loadRecentTasks();
  if (tasks.length === 0) {
    console.log('[gen-skill] 无近期任务记录。先完成几个任务后会自动生成记录。');
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run');
  const isAuto = args.includes('--auto');

  if (isAuto) {
    const patterns = detectPatterns(tasks);
    if (patterns.length === 0) {
      console.log('[gen-skill] 未检测到高频标签（需要 ≥3 次相同标签的任务）。');
      console.log(`当前拥有 ${tasks.length} 条任务记录。`);
      process.exit(0);
    }

    for (const { tag, count } of patterns) {
      const matchingTasks = tasks.filter(t => t.tags.includes(tag));
      const skillName = `${AUTO_PREFIX}${tag}-ops`;
      const content = generateSkill(skillName, matchingTasks, { tag });

      if (dryRun) {
        console.log(`\n[Dry-run] 将为标签 "${tag}" (${count}次) 生成 skill: ${skillName}.md`);
        console.log(content.split('\n').slice(0, 15).join('\n'));
        console.log('...\n');
      } else {
        if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });
        const filePath = path.join(SKILLS_DIR, `${skillName}.md`);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`[gen-skill] ✅ 已生成 ${filePath} (来自 ${count} 次 ${tag} 任务)`);
      }
    }
  } else {
    const skillName = args[0];
    const tagArg = args.find(a => a.startsWith('--tag='));
    const tag = tagArg ? tagArg.split('=')[1] : null;

    const matchingTasks = tag
      ? tasks.filter(t => t.tags.includes(tag))
      : tasks;

    const content = generateSkill(skillName, matchingTasks, { tag });

    if (dryRun) {
      console.log(`[Dry-run] 将为 "${skillName}" 生成 skill (基于 ${matchingTasks.length} 条任务):`);
      console.log(content.split('\n').slice(0, 20).join('\n'));
      console.log('...');
    } else {
      if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });
      const filePath = path.join(SKILLS_DIR, `${skillName}.md`);
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`[gen-skill] ✅ 已生成 ${filePath}`);
    }
  }
}

main().catch(err => {
  console.error('[gen-skill] ERROR:', err.message);
  process.exit(1);
});
