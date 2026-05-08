/**
 * decisions CLI — 长期记忆决策存档查询
 * 用法:
 *   node decisions.js --list                   列出所有决策
 *   node decisions.js --date 2026-05-08        按日期查询
 *   node decisions.js --keyword "安全"          按关键词查询
 *   node decisions.js --id 011                 按 ID 查询详情
 *   node decisions.js --last 5                 最近 N 条
 *   node decisions.js --timeline               完整时间线 (含 5W1H)
 */
'use strict';

const { readFileSync, readdirSync, existsSync } = require('fs');
const path = require('path');

const DECISIONS_DIR = path.resolve(__dirname, '../decisions');
const m = ([, v]) => v || '_';

function parseArgs() {
  const a = { list: false, timeline: false };
  for (let i = 2; i < process.argv.length; i++) {
    const k = process.argv[i], v = process.argv[i + 1] || null;
    if (k === '--list') a.list = true;
    else if (k === '--timeline') a.timeline = true;
    else if (k === '--date') { a.date = v; i++; }
    else if (k === '--keyword') { a.keyword = v; i++; }
    else if (k === '--id') { a.id = v; i++; }
    else if (k === '--last') { a.last = parseInt(v); i++; }
  }
  return a;
}

function listDecisions() {
  const files = readdirSync(DECISIONS_DIR).filter(f => f.endsWith('.md') && f !== 'INDEX.md').sort();
  return files.map(f => {
    const p = path.join(DECISIONS_DIR, f);
    const content = readFileSync(p, 'utf8');
    const title = m(content.match(/^# Decision \d+ — (.+)$/m));
    const when = m(content.match(/-\s*\*\*When\*\*:\s*(.+)/));
    const what = m(content.match(/-\s*\*\*What\*\*:\s*(.+)/));
    const why = m(content.match(/-\s*\*\*Why\*\*:?\s*\n\s*-\s*(.+)/));
    return { file: f, title, when, what, why, content, path: p };
  });
}

function printDecision(d) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${d.title}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  When: ${d.when}`);
  console.log(`  File: ${d.file}`);
  console.log(`\n  What: ${d.what}`);
  if (d.why) console.log(`  Why:  ${d.why}`);
  // Print full 5W1H from content
  const fiveWs = d.content.match(/-\s*\*\*([A-Z].+?)\*\*:\s*(.+)/g);
  if (fiveWs) {
    fiveWs.forEach(w => console.log(`  ${w.replace(/\*\*/g, '')}`));
  }
}

const args = parseArgs();

if (!existsSync(DECISIONS_DIR)) {
  console.log('决策存档目录不存在。先跑一次 git commit 让钩子自动创建。');
  process.exit(1);
}

const decisions = listDecisions();

if (decisions.length === 0) {
  console.log('暂无决策存档。');
  process.exit(0);
}

if (args.list) {
  console.log(`共 ${decisions.length} 条决策:\n`);
  decisions.forEach((d, i) => {
    console.log(`  [${String(i+1).padStart(3,'0')}] ${d.when.substring(0,16)}  ${d.title}`);
  });
  console.log(`\n精确查询: node decisions.js --id 011`);
  console.log(`按日期:   node decisions.js --date 2026-05-08`);
  console.log(`按关键词: node decisions.js --keyword "安全"`);
  console.log(`完整时间线: node decisions.js --timeline`);
} else if (args.timeline) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`  决策时间线 — ${decisions.length} 条`);
  console.log(`${'='.repeat(80)}`);
  decisions.forEach((d, i) => {
    console.log(`\n  ── [${String(i+1).padStart(2,'0')}] ${d.when} ──`);
    console.log(`  📌 ${d.title}`);
    console.log(`  📝 ${d.what}`);
    if (d.why) console.log(`  ❓ ${d.why}`);
  });
  console.log(`\n${'='.repeat(80)}`);
  console.log(`  总共 ${decisions.length} 条记录, 覆盖 ${decisions[0].when.substring(0,10)} 到 ${decisions[decisions.length-1].when.substring(0,10)}`);
} else if (args.date) {
  const matched = decisions.filter(d => d.when.startsWith(args.date));
  if (matched.length === 0) {
    console.log(`日期 "${args.date}" 无匹配决策。`);
    console.log(`可用日期: ${[...new Set(decisions.map(d => d.when.substring(0,10)))].join(', ')}`);
  } else {
    console.log(`\n${args.date} — ${matched.length} 条决策:`);
    matched.forEach(d => printDecision(d));
  }
} else if (args.keyword) {
  const kw = args.keyword.toLowerCase();
  const matched = decisions.filter(d => d.content.toLowerCase().includes(kw) || d.title.includes(kw));
  console.log(`\n关键词 "${args.keyword}" — ${matched.length} 条匹配:`);
  matched.forEach(d => printDecision(d));
} else if (args.id) {
  const id = args.id.padStart(3, '0');
  const d = decisions.find(d => d.file.includes(`_${id}_`));
  if (d) printDecision(d); else console.log(`ID ${args.id} 不存在。`);
} else if (args.last) {
  const recent = decisions.slice(-args.last);
  recent.forEach(d => printDecision(d));
  console.log(`\n  (最近 ${args.last} 条 / 共 ${decisions.length} 条)`);
} else {
  console.log(`决策存档: ${decisions.length} 条记录\n`);
  console.log(`用法:`);
  console.log(`  node decisions.js --list              列出全部`);
  console.log(`  node decisions.js --date 2026-05-08   按日期查`);
  console.log(`  node decisions.js --keyword "安全"     按关键词查`);
  console.log(`  node decisions.js --id 011            按ID查`);
  console.log(`  node decisions.js --last 5            最近5条`);
  console.log(`  node decisions.js --timeline          完整时间线`);
}
