/**
 * Fix script-block Chinese strings in Vue files by replacing with i18n t() calls.
 * v2: Added confirm() pattern, expanded string map, suffix handling.
 * Handles: toast.error/success, confirm(), error.value assignments.
 * Usage: node scripts/fix_script_i18n.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CLIENT_DIR = path.join(ROOT, 'client', 'pages');
const DRY_RUN = process.argv.includes('--dry-run');

// Common script-block string -> common i18n key
const STRING_MAP = {
  // Basic CRUD
  '加载失败': 'common.loadFail',
  '保存失败': 'common.failed_save',
  '保存成功': 'common.success_save',
  '删除失败': 'common.failed_delete',
  '已删除': 'common.delete_success',
  '创建失败': 'common.failed_create',
  '创建成功': 'common.success_create',
  '网络错误': 'common.network_error',
  '提交失败': 'common.failed_submit',
  '更新成功': 'common.success_update',
  '更新失败': 'common.failed_update',
  '操作成功': 'common.success',
  '操作失败': 'common.failed',
  '请求失败': 'common.request_failed',
  '上传失败': 'common.failed_upload',
  '暂无数据': 'common.noData',
  '请先登录': 'common.login_required',
  // Additional common patterns
  '发布失败': 'common.failed_submit',
  '生成失败': 'common.failed_generate',
  '生成失败，请重试': 'common.failed_generate_retry',
  '提交失败，请重试': 'common.failed_submit_retry',
  '上传失败，请重试': 'common.failed_upload_retry',
  '任务提交失败，请重试': 'common.failed_submit_retry',
  '确认删除？': 'common.confirm_delete',
  '确定删除？': 'common.confirm_delete',
  '确定删除?': 'common.confirm_delete',
  '确认删除?': 'common.confirm_delete',
  '确定取消收藏？': 'common.confirm_unfavorite',
  '确定删除该 GEO 规则？': 'common.confirm_delete_item',
  '确认删除该代理配置？': 'common.confirm_delete',
  '确认提交此模板给运营审核吗？审核通过后将收录为官方模板，全平台商家可用。': 'common.confirm_submit_review',
  '翻译失败': 'common.failed_translate',
  '发送失败': 'common.failed_send',
  '添加失败': 'common.failed_add',
  '添加成功': 'common.success_add',
  '退款成功': 'common.success_refund',
  '退款失败': 'common.failed_refund',
  '发布成功！': 'common.success_publish',
  '已发送': 'common.sent',
  '已复制到剪贴板': 'common.copied',
  '草稿已保存': 'common.draft_saved',
  '已提交审核': 'common.submitted_review',
  '复制失败': 'common.failed_copy',
  '加载失败: ': 'common.loadFail',
  '保存失败: ': 'common.failed_save',
  '删除失败: ': 'common.failed_delete',
  '提交失败: ': 'common.failed_submit',
  '发布失败: ': 'common.failed_submit',
  '创建失败: ': 'common.failed_create',
  '生成失败: ': 'common.failed_generate',
  '复制失败: ': 'common.failed_copy',
  '保存成功，工作流实时生效': 'common.saved_realtime',
  '请输入标题': 'common.enter_title',
  '上传成功': 'common.success_upload',
  '删除成功': 'common.success_delete',
  '启用成功': 'common.success_enable',
  '停用成功': 'common.success_disable',
};

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let totalFixes = 0;
const modifiedFiles = [];

function ensureUseI18n(scriptContent) {
  if (scriptContent.includes('useI18n()')) return scriptContent;
  const lines = scriptContent.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s+/.test(lines[i])) lastImportIdx = i;
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, 'const { t } = useI18n()');
  } else {
    lines.unshift('const { t } = useI18n()');
  }
  return lines.join('\n');
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  let needsUseI18n = false;

  const hasUseI18n = content.includes('useI18n()');

  // Find script setup block
  const scriptMatch = content.match(/<script[^>]*setup[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) return;

  let scriptContent = scriptMatch[1];

  // --- 1. confirm() calls with hardcoded Chinese ---
  // Handle: confirm({ message: '确定删除?' })
  // Handle: confirm({ message: '确定取消收藏？', variant: 'warning' })
  // Match confirm({ message: '...' ... }) where ... contains Chinese
  const confirmStrRegex = /confirm\s*\(\s*\{\s*message\s*:\s*'([^']*[\u4e00-\u9fff][^']*)'/g;
  scriptContent = scriptContent.replace(confirmStrRegex, (match, chinese) => {
    const i18nKey = STRING_MAP[chinese];
    if (i18nKey) {
      needsUseI18n = true;
      hasChanges = true;
      totalFixes++;
      return match.replace(`'${chinese}'`, `t('${i18nKey}')`);
    }
    return match;
  });

  // Same for double-quoted strings
  const confirmDblRegex = /confirm\s*\(\s*\{\s*message\s*:\s*"([^"]*[\u4e00-\u9fff][^"]*)"/g;
  scriptContent = scriptContent.replace(confirmDblRegex, (match, chinese) => {
    const i18nKey = STRING_MAP[chinese];
    if (i18nKey) {
      needsUseI18n = true;
      hasChanges = true;
      totalFixes++;
      return match.replace(`"${chinese}"`, `t('${i18nKey}')`);
    }
    return match;
  });

  // --- 2. toast.error/success/warning with exact string match ---
  for (const [chinese, i18nKey] of Object.entries(STRING_MAP)) {
    const esc = escapeRegExp(chinese);

    const toastPatterns = [
      new RegExp(`(toast\\.(?:error|success|warn(?:ing)?|info)\\()'${esc}'(\\))`, 'g'),
      new RegExp(`(toast\\.(?:error|success|warn(?:ing)?|info)\\()"${esc}"(\\))`, 'g'),
      new RegExp(`(useToast\\(\\)\\.(?:error|success|warn(?:ing)?|info)\\()'${esc}'(\\))`, 'g'),
      new RegExp(`(useToast\\(\\)\\.(?:error|success|warn(?:ing)?|info)\\()"${esc}"(\\))`, 'g'),
    ];

    for (const pattern of toastPatterns) {
      const newContent = scriptContent.replace(pattern, (match, prefix, suffix) => {
        needsUseI18n = true;
        hasChanges = true;
        totalFixes++;
        return `${prefix}t('${i18nKey}')${suffix}`;
      });
      if (newContent !== scriptContent) {
        scriptContent = newContent;
      }
    }

    // error.value = '中文' / msg.value = '中文'
    const valuePatterns = [
      new RegExp(`((?:error|msg)\\.value\\s*=\\s*)'${esc}'`, 'g'),
      new RegExp(`((?:error|msg)\\.value\\s*=\\s*)"${esc}"`, 'g'),
    ];
    for (const pattern of valuePatterns) {
      const newContent = scriptContent.replace(pattern, (match, prefix) => {
        needsUseI18n = true;
        hasChanges = true;
        totalFixes++;
        return `${prefix}t('${i18nKey}')`;
      });
      if (newContent !== scriptContent) {
        scriptContent = newContent;
      }
    }
  }

  // --- 3. Fallback Chinese in error chains: || '上传失败' ---
  const FALLBACK_MAP = {
    '上传失败': 'common.failed_upload',
    '加载失败': 'common.loadFail',
    '保存失败': 'common.failed_save',
    '提交失败': 'common.failed_submit',
    '删除失败': 'common.failed_delete',
    '网络错误': 'common.network_error',
    '操作失败': 'common.failed',
    '生成失败': 'common.failed_generate',
    '发送失败': 'common.failed_send',
    '翻译失败': 'common.failed_translate',
    '任务提交失败，请重试': 'common.failed_submit_retry',
    '生成失败，请重试': 'common.failed_generate_retry',
    '提交失败，请重试': 'common.failed_submit_retry',
    '上传失败，请重试': 'common.failed_upload_retry',
    '请先上传图片': 'common.upload_image_first',
    '请输入标题': 'common.enter_title',
    '未知错误': 'common.unknown_error',
  };

  for (const [chinese, i18nKey] of Object.entries(FALLBACK_MAP)) {
    const esc = escapeRegExp(chinese);
    const fbRe = new RegExp(`\\|\\|\\s*'${esc}'(\\s*[\\)\\,])`, 'g');
    scriptContent = scriptContent.replace(fbRe, (m, s) => {
      needsUseI18n = true; hasChanges = true; totalFixes++;
      return `|| t('${i18nKey}')${s}`;
    });
    const fbReDbl = new RegExp(`\\|\\|\\s*"${esc}"(\\s*[\\)\\,])`, 'g');
    scriptContent = scriptContent.replace(fbReDbl, (m, s) => {
      needsUseI18n = true; hasChanges = true; totalFixes++;
      return `|| t('${i18nKey}')${s}`;
    });
  }

  // --- 4. String concat: '加载失败: ' + → t('common.loadFail') + ' : ' + ---
  for (const [chinese, i18nKey] of Object.entries(STRING_MAP)) {
    if (!chinese.endsWith(': ')) continue;
    const esc = escapeRegExp(chinese);
    const concatRe = new RegExp(`'${esc}'\\s*\\+`, 'g');
    scriptContent = scriptContent.replace(concatRe, () => {
      needsUseI18n = true; hasChanges = true; totalFixes++;
      return `t('${i18nKey}') + ' : ' + `;
    });
    const concatReDbl = new RegExp(`"${esc}"\\s*\\+`, 'g');
    scriptContent = scriptContent.replace(concatReDbl, () => {
      needsUseI18n = true; hasChanges = true; totalFixes++;
      return `t('${i18nKey}') + ' : ' + `;
    });
  }

  if (!hasChanges) return;

  // Add useI18n if needed and not already present
  if (needsUseI18n && !hasUseI18n) {
    scriptContent = ensureUseI18n(scriptContent);
  }

  // Reconstruct file
  content = content.replace(scriptMatch[1], scriptContent);

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  modifiedFiles.push(path.relative(CLIENT_DIR, filePath));
  console.log(`  ${DRY_RUN ? '[DRY] ' : ''}${path.relative(CLIENT_DIR, filePath)}`);
}

// Walk client/pages
function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.nuxt') continue;
    if (entry.isDirectory()) {
      walkDir(full);
    } else if (entry.name.endsWith('.vue')) {
      processFile(full);
    }
  }
}

console.log(`Script-Block i18n Fix v2 ${DRY_RUN ? '(DRY RUN)' : '(WRITE MODE)'}\n`);
walkDir(CLIENT_DIR);
console.log(`\nDone: ${modifiedFiles.length} files modified, ${totalFixes} total fixes`);
if (DRY_RUN) console.log('(DRY RUN — no files written. Remove --dry-run to apply.)');
