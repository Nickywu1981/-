---
name: i18n-manager
description: Auto-detect missing i18n keys, untranslated keys, hardcoded Chinese strings in UI files
type: skill
source: community-import
---

# i18n Manager

> 自动检测国际化遗漏：硬编码中文、缺失 key、中英文不一致。

## TRIGGER
当用户请求 "i18n check"、"检查国际化"、"翻译完整性"、或新增 Vue 组件/页面时。

## 检测步骤

### 1. 硬编码中文检测
```bash
cd client && node scripts/check-i18n.js
```
- 扫描所有 `.vue` 和 `.ts` 文件
- 排除注释 (`//` 和 `/* */`)、console.log、测试文件中的中文
- 报警规则：用户可见 UI 文本中出现纯中文

### 2. 缺失 Key 检测
- 收集所有 `$t('...')` 调用 → 提取 key 名称
- 对比 `zh.json` 和 `en.json` 中的 key 集合
- 报告：一侧有而另一侧无的 key

### 3. 占位符一致性
- 检测 `{变量名}` 占位符格式（非 `{{变量名}}`，后者会与 Mustache/Vue 冲突）
- 报告使用 `{{}}` 双花括号的 key（可能被 Vue 误解析）

### 4. 未翻译 Key
- 对比 `zh.json` 和 `en.json` 中相同 key 的值
- 如果 en value === zh value（且含中文字符）→ 标记为未翻译
- 如果 en value === "" → 标记为缺失翻译

## 修复流程
1. 打开报警文件 → 定位硬编码行
2. 在 `zh.json` 和 `en.json` 末尾加 key
3. 替换硬编码文本为 `$t('section.key')`
4. 重新运行检测确认清零

## 验收标准
- [ ] `npm run lint:i18n` 零报警（UI 文件）
- [ ] `zh.json` 和 `en.json` 的 key 集合完全一致
- [ ] 零 `{{}}` 双花括号占位符
- [ ] 零中英文同值（除非是数字/URL等语言无关内容）
