/**
 * Batch common i18n migration for admin Vue pages.
 * Replaces frequently-used Chinese strings in templates with $t('common.xxx').
 * Handles: button text, table headers, labels, options, placeholder attributes.
 */
const fs = require('fs');
const path = require('path');

const ADMIN_DIR = path.resolve(__dirname, '../client/pages/admin');
const TEMPLATE_RE = /<template>([\s\S]*)<\/template>/;

// Common string → i18n key mapping (exact matches)
const COMMON_MAP = {
  '编辑': 'common.edit',
  '删除': 'common.delete',
  '操作': 'common.actions',
  '创建': 'common.create',
  '新增': 'common.add',
  '名称': 'common.name',
  '描述': 'common.description',
  '状态': 'common.status',
  '类型': 'common.type',
  '时间': 'common.time',
  '日期': 'common.date',
  '关闭': 'common.close',
  '提交': 'common.submit',
  '重置': 'common.reset',
  '筛选': 'common.filter',
  '全部': 'common.all',
  '导出': 'common.export',
  '导入': 'common.import',
  '查看': 'common.view',
  '详情': 'common.details',
  '复制': 'common.copy',
  '刷新': 'common.refresh',
  '更多': 'common.more',
  '设置': 'common.settings',
  '上传': 'common.upload',
  '下载': 'common.download',
  '保存': 'common.save',
  '取消': 'common.cancel',
  '确认': 'common.confirm',
  '搜索': 'common.search',
  '加载中...': 'common.loading',
  '暂无数据': 'common.noData',
  '启用': 'common.statusEnabled',
  '禁用': 'common.statusDisabled',
  '是': 'common.yes',
  '否': 'common.no',
  '已启用': 'common.enabled',
  '已禁用': 'common.disabled',
  '警告': 'common.warning',
  '成功': 'common.success',
  '失败': 'common.failed',
  '错误': 'common.error',
  '备注': 'common.remark',
  '排序': 'common.sort',
  '保存中...': 'common.saving',
  '返回': 'common.back',
  '上一页': 'common.prevPage',
  '下一页': 'common.nextPage',
};

let totalReplacements = 0;
const filesModified = [];

function processFile(filePath) {
  const fileName = path.basename(filePath);
  // Skip already-migrated pages
  if (['ab-experiments.vue', 'workflow-config.vue', 'multilingual.vue'].includes(fileName)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  const tplMatch = content.match(TEMPLATE_RE);
  if (!tplMatch) return;

  let tpl = tplMatch[1];
  let changed = false;

  for (const [chinese, i18nKey] of Object.entries(COMMON_MAP)) {
    // 1. Text nodes: >中文内容< → >{{ $t('key') }}<
    const textNodePattern = new RegExp(
      `>([^<]*)${escapeRegex(chinese)}([^<]*)<`,
      'g'
    );
    tpl = tpl.replace(textNodePattern, (match, before, after) => {
      // Skip already-i18n or dynamic expressions
      if (match.includes('{{') || match.includes('$t(')) return match;
      changed = true;
      totalReplacements++;
      return `>${before}{{ $t('${i18nKey}') }}${after}<`;
    });

    // 2. Button text: >中文</button>
    const btnPattern = new RegExp(`>${escapeRegex(chinese)}<\\/button>`, 'g');
    if (!tpl.includes('{{')) {
      tpl = tpl.replace(btnPattern, (m) => {
        changed = true;
        totalReplacements++;
        return `>{{ $t('${i18nKey}') }}</button>`;
      });
    }

    // 3. Placeholder: placeholder="中文..."
    const phPattern = new RegExp(`placeholder="${escapeRegex(chinese)}"`, 'g');
    tpl = tpl.replace(phPattern, (m) => {
      changed = true;
      totalReplacements++;
      return `:placeholder="$t('${i18nKey}')"`;
    });

    // 4. Title: title="中文"
    const titlePattern = new RegExp(`title="${escapeRegex(chinese)}"`, 'g');
    tpl = tpl.replace(titlePattern, (m) => {
      changed = true;
      totalReplacements++;
      return `:title="$t('${i18nKey}')"`;
    });

    // 5. Label: >中文</label>
    const labelPattern = new RegExp(`>${escapeRegex(chinese)}<\\/label>`, 'g');
    tpl = tpl.replace(labelPattern, (m) => {
      if (m.includes('{{')) return m;
      changed = true;
      totalReplacements++;
      return `>{{ $t('${i18nKey}') }}</label>`;
    });
  }

  if (changed) {
    content = content.replace(tplMatch[1], tpl);
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified.push(fileName);
    console.log(`  ✓ ${fileName}: migrated`);
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Process all admin .vue files
const files = fs.readdirSync(ADMIN_DIR).filter(f => f.endsWith('.vue'));
console.log(`Processing ${files.length} admin pages...\n`);

for (const f of files) {
  processFile(path.join(ADMIN_DIR, f));
}

console.log(`\nDone: ${filesModified.length} files modified, ${totalReplacements} total replacements`);
console.log('Modified:', filesModified.join(', '));
