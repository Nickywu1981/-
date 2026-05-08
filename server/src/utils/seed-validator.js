/**
 * Movio AI v4.1 — seed-validator.js
 * G6 数据库接口 | 2026-05-08
 * 校验所有 sys_config_group/sys_config_item/sys_dict 引用完整性
 */

/**
 * @typedef {{ table: string; field: string; value: string; message: string }} ValidationError
 */

/**
 * @param {import('mysql2/promise').Pool} pool
 * @returns {Promise<{ passed: boolean; errors: ValidationError[] }>}
 */
export async function validateSeed(pool) {
  const errors = [];

  // 1. 检查 config_item 的 group_key 是否都存在于 config_group
  const [orphanItems] = await pool.query(`
    SELECT ci.group_key, ci.item_key
    FROM sys_config_item ci
    LEFT JOIN sys_config_group cg ON ci.group_key = cg.group_key
    WHERE cg.group_key IS NULL
  `);
  for (const row of orphanItems) {
    errors.push({ table: 'sys_config_item', field: 'group_key', value: row.group_key, message: `item "${row.item_key}" 引用了不存在的分组 "${row.group_key}"` });
  }

  // 2. 检查 dict_item 的 dict_key 是否都存在于 dict_group
  const [orphanDicts] = await pool.query(`
    SELECT di.dict_key, di.item_key
    FROM sys_dict_item di
    LEFT JOIN sys_dict_group dg ON di.dict_key = dg.dict_key
    WHERE dg.dict_key IS NULL
  `);
  for (const row of orphanDicts) {
    errors.push({ table: 'sys_dict_item', field: 'dict_key', value: row.dict_key, message: `dict_item "${row.item_key}" 引用了不存在的字典 "${row.dict_key}"` });
  }

  // 3. 检查 config_group 的 parent_key 引用完整性
  const [orphanParents] = await pool.query(`
    SELECT cg.group_key, cg.parent_key
    FROM sys_config_group cg
    WHERE cg.parent_key != '' AND cg.parent_key NOT IN (SELECT group_key FROM sys_config_group)
  `);
  for (const row of orphanParents) {
    errors.push({ table: 'sys_config_group', field: 'parent_key', value: row.parent_key, message: `分组 "${row.group_key}" 引用了不存在的父级 "${row.parent_key}"` });
  }

  // 4. 检查 dict_group 的 parent_key 引用完整性
  const [orphanDictParents] = await pool.query(`
    SELECT dg.dict_key, dg.parent_key
    FROM sys_dict_group dg
    WHERE dg.parent_key != '' AND dg.parent_key NOT IN (SELECT dict_key FROM sys_dict_group)
  `);
  for (const row of orphanDictParents) {
    errors.push({ table: 'sys_dict_group', field: 'parent_key', value: row.parent_key, message: `字典 "${row.dict_key}" 引用了不存在的父级 "${row.parent_key}"` });
  }

  // 5. 检查关键分组的必填 item_key
  const requiredKeys = {
    'page.auth.login': ['page_title', 'btn_login'],
    'page.auth.register': ['page_title', 'btn_submit'],
    'page.home.hero': ['title', 'btn_start'],
    'comp.upload': ['btn_upload', 'drag_hint'],
    'comp.task': ['status_queued', 'status_processing', 'status_completed', 'status_failed'],
    'nav.sidebar': ['label_home', 'label_video', 'label_image'],
    'sys.upload': ['max_size_mb', 'chunk_size_mb'],
    'sys.model': ['default_mode', 'max_retries'],
    'biz.member': ['plan_free_name', 'plan_basic_name', 'plan_pro_name'],
    'biz.points': ['cost_image_gen', 'cost_video_gen'],
    'biz.free_trial': ['free_points'],
  };

  for (const [groupKey, keys] of Object.entries(requiredKeys)) {
    const [existing] = await pool.query(
      'SELECT item_key FROM sys_config_item WHERE group_key = ? AND item_key IN (?)',
      [groupKey, keys],
    );
    const existingKeys = existing.map((r) => r.item_key);
    for (const key of keys) {
      if (!existingKeys.includes(key)) {
        errors.push({ table: 'sys_config_item', field: 'item_key', value: key, message: `分组 "${groupKey}" 缺少必填配置项 "${key}"` });
      }
    }
  }

  return { passed: errors.length === 0, errors };
}
