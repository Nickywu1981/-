/**
 * 跨境合规检查服务
 * 各平台/国家对产品图片和文案的合规要求
 */
const COMPLIANCE_RULES = {
  // 平台级别规则
  amazon: {
    name: 'Amazon',
    imageRules: [
      { id: 'amz_bg', desc: '主图必须纯白底 (RGB 255,255,255)', severity: 'critical' },
      { id: 'amz_occupy', desc: '产品占画面至少85%', severity: 'critical' },
      { id: 'amz_no_text', desc: '主图不得包含文字/Logo/水印', severity: 'critical' },
      { id: 'amz_no_border', desc: '不得添加边框', severity: 'warning' },
    ],
    textRules: [
      { id: 'amz_no_price', desc: '标题不得包含价格/促销信息', severity: 'critical' },
      { id: 'amz_no_contact', desc: '不得包含联系方式', severity: 'critical' },
      { id: 'amz_no_claim', desc: '不得包含未经证实的功效声明', severity: 'critical' },
    ],
  },
  temu: {
    name: 'Temu',
    imageRules: [
      { id: 'temu_no_logo', desc: '不得包含其他平台Logo', severity: 'critical' },
      { id: 'temu_clear', desc: '图片清晰无模糊', severity: 'warning' },
    ],
    textRules: [
      { id: 'temu_price', desc: '价格必须具有竞争力', severity: 'warning' },
    ],
  },
  tiktok: {
    name: 'TikTok Shop',
    imageRules: [
      { id: 'tt_no_nudity', desc: '严格禁止裸露/性感内容', severity: 'critical' },
      { id: 'tt_safe', desc: '内容必须全年龄段适宜', severity: 'critical' },
      { id: 'tt_vertical', desc: '推荐9:16竖版比例', severity: 'info' },
    ],
    textRules: [
      { id: 'tt_no_fake', desc: '禁止虚假宣传/夸大功效', severity: 'critical' },
    ],
  },
  shein: {
    name: 'Shein',
    imageRules: [
      { id: 'shein_model', desc: '服装类必须有模特上身图', severity: 'warning' },
      { id: 'shein_size', desc: '必须有尺码对照图', severity: 'warning' },
    ],
    textRules: [],
  },
  // 国家/地区级别规则
  eu: {
    name: '欧盟 (EU)',
    imageRules: [
      { id: 'eu_ce', desc: '电子产品需显示CE标志', severity: 'critical' },
      { id: 'eu_recycle', desc: '包装需显示WEEE回收标志', severity: 'warning' },
    ],
    textRules: [
      { id: 'eu_gdpr', desc: '用户评价需符合GDPR要求', severity: 'critical' },
      { id: 'eu_lang', desc: '产品信息需提供目的国语言版本', severity: 'warning' },
      { id: 'eu_warranty', desc: '必须标明2年保修条款', severity: 'critical' },
    ],
  },
  us: {
    name: '美国 (US)',
    imageRules: [
      { id: 'us_fcc', desc: '无线电子产品需FCC声明', severity: 'warning' },
    ],
    textRules: [
      { id: 'us_fda', desc: '食品/化妆品不得含医疗功效宣称', severity: 'critical' },
      { id: 'us_prop65', desc: '加州Prop65致癌物警告(如适用)', severity: 'critical' },
    ],
  },
  jp: {
    name: '日本',
    imageRules: [
      { id: 'jp_quality', desc: '图片质量要求极高，不得有瑕疵', severity: 'warning' },
    ],
    textRules: [
      { id: 'jp_pse', desc: '电器产品需PSE认证标识', severity: 'critical' },
      { id: 'jp_label', desc: '成分/材质标签必须完整', severity: 'critical' },
    ],
  },
};

/** 获取指定平台的合规规则 */
export function getPlatformCompliance(platformCode) {
  return COMPLIANCE_RULES[platformCode] || null;
}

/** 获取指定区域的合规规则 */
export function getRegionCompliance(regionCode) {
  return COMPLIANCE_RULES[regionCode] || null;
}

/** 综合合规检查（平台+区域） */
export function checkCompliance({ platform, region, category }) {
  const results = [];
  const platformRules = COMPLIANCE_RULES[platform];
  const regionRules = COMPLIANCE_RULES[region];

  if (platformRules) {
    results.push({
      source: platformRules.name,
      type: 'platform',
      imageRules: platformRules.imageRules || [],
      textRules: platformRules.textRules || [],
    });
  }

  if (regionRules && region !== platform) {
    results.push({
      source: regionRules.name,
      type: 'region',
      imageRules: regionRules.imageRules || [],
      textRules: regionRules.textRules || [],
    });
  }

  const criticalCount = results.reduce(
    (sum, r) =>
      sum +
      r.imageRules.filter(ir => ir.severity === 'critical').length +
      r.textRules.filter(tr => tr.severity === 'critical').length,
    0,
  );

  return {
    results,
    totalRules: results.reduce((s, r) => s + r.imageRules.length + r.textRules.length, 0),
    criticalCount,
    isCompliant: criticalCount === 0,
  };
}

/** 列出所有支持的合规检查对象 */
export function listComplianceTargets() {
  return Object.entries(COMPLIANCE_RULES).map(([code, config]) => ({
    code,
    name: config.name,
    imageRuleCount: config.imageRules.length,
    textRuleCount: config.textRules.length,
  }));
}

export default { getPlatformCompliance, getRegionCompliance, checkCompliance, listComplianceTargets, COMPLIANCE_RULES };
