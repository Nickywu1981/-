/**
 * Fix script-block Chinese strings in Vue files by replacing with i18n t() calls.
 * Handles: toast.error/success, error.value, msg.value assignments.
 * Usage: node scripts/fix_script_i18n.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CLIENT_DIR = path.join(ROOT, 'client', 'pages');
const DRY_RUN = process.argv.includes('--dry-run');

// Common script-block string → common i18n key
const STRING_MAP = {
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
};

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let totalFixes = 0;
const modifiedFiles = [];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  let needsUseI18n = false;

  // Check if useI18n is already imported/used in script
  const hasUseI18n = content.includes('useI18n()');

  // Find script setup block
  const scriptMatch = content.match(/<script[^>]*setup[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) return;

  let scriptContent = scriptMatch[1];

  for (const [chinese, i18nKey] of Object.entries(STRING_MAP)) {
    const esc = escapeRegExp(chinese);

    // toast.error('中文') / toast.success('中文') / toast.warning('中文')
    const toastPatterns = [
      new RegExp(`(toast\\.(?:error|success|warning|info)\\()'${esc}'(\\))`, 'g'),
      new RegExp(`(toast\\.(?:error|success|warning|info)\\()"${esc}"(\\))`, 'g'),
      // useToast().error('中文')
      new RegExp(`(useToast\\(\\)\\.(?:error|success|warning|info)\\()'${esc}'(\\))`, 'g'),
      new RegExp(`(useToast\\(\\)\\.(?:error|success|warning|info)\\()"${esc}"(\\))`, 'g'),
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
      new RegExp(`((?:error|msg)\\.value\\s*=\\s*)'${esc}'`, 'g'),
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

  if (!hasChanges) return;

  // Add useI18n if needed and not already present
  if (needsUseI18n && !hasUseI18n) {
    // Find a good insertion point: after the last import statement or at the start
    const importEndMatch = scriptContent.match(/import\s+.*\n(?!import)/);
    if (importEndMatch) {
      const insertPos = scriptContent.indexOf(importEndMatch[0]) + importEndMatch[0].length;
      scriptContent = scriptContent.slice(0, insertPos) +
        `const { t } = useI18n()\n` + scriptContent.slice(insertPos);
    } else {
      scriptContent = `const { t } = useI18n()\n` + scriptContent;
    }
  }

  // Reconstruct file
  content = content.replace(scriptMatch[1], scriptContent);

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  modifiedFiles.push(path.relative(CLIENT_DIR, filePath));
  console.log(`  ${DRY_RUN ? '[DRY] ' : ''}✓ ${path.relative(CLIENT_DIR, filePath)}`);
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

console.log(`Script-Block i18n Fix ${DRY_RUN ? '(DRY RUN)' : '(WRITE MODE)'}\n`);
walkDir(CLIENT_DIR);
console.log(`\nDone: ${modifiedFiles.length} files modified, ${totalFixes} total fixes`);
if (DRY_RUN) console.log('(DRY RUN — no files written. Remove --dry-run to apply.)');
