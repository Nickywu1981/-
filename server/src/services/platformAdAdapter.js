/**
 * 投流平台适配器 — 4大广告平台差异化参数
 *
 * 覆盖平台:
 *   qianchuan    — 巨量千川 (抖音电商)
 *   ocean_engine — 巨量引擎 (字节全系)
 *   magnetic     — 磁力金牛 (快手电商)
 *   alimama      — 阿里妈妈 (淘宝/天猫)
 *
 * 每个平台差异化: 视频规格/创意格式/优化目标/审核红线/落地页要求
 */
import logger from '../utils/logger.js';

// ==================== 平台规格定义 ====================

const PLATFORM_SPECS = {
  qianchuan: {
    name: '巨量千川',
    displayName: '抖音电商投放',
    video: {
      aspectRatios: ['9:16', '16:9', '1:1'],
      recommendedRatio: '9:16',
      durations: [5, 15, 30, 60],
      recommendedDuration: 30,
      maxSizeMB: 500,
      formats: ['mp4', 'mov'],
      codec: 'h264',
      bitrate: '2-6 Mbps',
      resolutions: {
        '9:16': '1080x1920',
        '16:9': '1920x1080',
        '1:1': '1080x1080',
      },
    },
    image: {
      aspectRatios: ['1:1', '16:9', '3:2'],
      maxSizeMB: 5,
      formats: ['jpg', 'png'],
    },
    creativeFormats: ['video', 'live_clip', 'image', 'carousel'],
    optimizationGoals: [
      { key: 'click', label: '点击量' },
      { key: 'conversion', label: '转化量' },
      { key: 'impression', label: '曝光量' },
      { key: 'shop_purchase', label: '商品购买' },
      { key: 'live_enter', label: '直播间进入' },
    ],
    landingPages: ['douyin_shop', 'douyin_miniapp', 'h5_page'],
    forbiddenContent: [
      '绝对化用语', '虚假承诺', '诱导点击', '低俗内容',
      '虚假倒计时', '虚假库存', '虚假原价', '疗效承诺',
      '微信引流', '私域引流', '第三方平台logo',
    ],
    trends: {
      hotMusic: ['热门BGM', '节奏感强'],
      hotStyles: ['真实场景', '前后对比', '口播讲解'],
      bestTimes: ['19:00-22:00', '12:00-14:00'],
    },
  },

  ocean_engine: {
    name: '巨量引擎',
    displayName: '字节跳动全系投放',
    video: {
      aspectRatios: ['9:16', '16:9', '1:1'],
      recommendedRatio: '16:9',
      durations: [5, 15, 30, 60, 90],
      recommendedDuration: 30,
      maxSizeMB: 1000,
      formats: ['mp4', 'mov', 'avi'],
      codec: 'h264',
      bitrate: '3-8 Mbps',
      resolutions: {
        '9:16': '1080x1920',
        '16:9': '1920x1080',
        '1:1': '1080x1080',
      },
    },
    image: {
      aspectRatios: ['1:1', '16:9', '3:2', '2:3'],
      maxSizeMB: 10,
      formats: ['jpg', 'png', 'gif'],
    },
    creativeFormats: ['video', 'image', 'carousel', 'playable_ad'],
    optimizationGoals: [
      { key: 'click', label: '点击量' },
      { key: 'conversion', label: '转化量' },
      { key: 'impression', label: '曝光量' },
      { key: 'app_install', label: '应用安装' },
      { key: 'form_submit', label: '表单提交' },
      { key: 'video_play', label: '视频播放' },
    ],
    landingPages: ['h5_page', 'app_download', 'mini_program', 'douyin_shop'],
    forbiddenContent: [
      '绝对化用语', '虚假承诺', '诱导点击', '低俗内容', '政治敏感',
      '竞品logo', '未授权IP', '虚假按钮',
    ],
    trends: {
      hotMusic: ['节奏感强', '轻快配乐'],
      hotStyles: ['原生感', '信息流风格', 'TVC品质'],
      bestTimes: ['18:00-23:00', '11:00-13:00'],
    },
  },

  magnetic: {
    name: '磁力金牛',
    displayName: '快手电商投放',
    video: {
      aspectRatios: ['9:16', '16:9', '1:1'],
      recommendedRatio: '9:16',
      durations: [7, 15, 30, 57],
      recommendedDuration: 30,
      maxSizeMB: 300,
      formats: ['mp4'],
      codec: 'h264',
      bitrate: '1.5-4 Mbps',
      resolutions: {
        '9:16': '720x1280',
        '16:9': '1280x720',
        '1:1': '1080x1080',
      },
    },
    image: {
      aspectRatios: ['1:1', '16:9', '3:4'],
      maxSizeMB: 5,
      formats: ['jpg', 'png'],
    },
    creativeFormats: ['video', 'live_clip', 'image'],
    optimizationGoals: [
      { key: 'click', label: '点击量' },
      { key: 'conversion', label: '转化量' },
      { key: 'impression', label: '曝光量' },
      { key: 'live_enter', label: '直播进入' },
      { key: 'follow', label: '涨粉' },
    ],
    landingPages: ['kuaishou_shop', 'h5_page', 'kuaishou_miniapp'],
    forbiddenContent: [
      '绝对化用语', '虚假承诺', '诱导点击', '低俗内容',
      '微信引流', '价格欺诈', '夸大功效',
    ],
    trends: {
      hotMusic: ['接地气BGM', '流行热歌', '朴实配乐'],
      hotStyles: ['真实老铁风', '产品展示', '使用教程'],
      bestTimes: ['18:00-22:00', '07:00-09:00'],
    },
  },

  alimama: {
    name: '阿里妈妈',
    displayName: '淘宝/天猫推广',
    video: {
      aspectRatios: ['1:1', '16:9', '3:4'],
      recommendedRatio: '1:1',
      durations: [9, 15, 30, 60],
      recommendedDuration: 30,
      maxSizeMB: 200,
      formats: ['mp4'],
      codec: 'h264',
      bitrate: '1-3 Mbps',
      resolutions: {
        '1:1': '800x800',
        '16:9': '1280x720',
        '3:4': '750x1000',
      },
    },
    image: {
      aspectRatios: ['1:1', '3:4'],
      recommendedRatio: '1:1',
      maxSizeMB: 3,
      formats: ['jpg', 'png'],
    },
    creativeFormats: ['image', 'video', 'carousel', 'super_recommend'],
    optimizationGoals: [
      { key: 'click', label: '点击量' },
      { key: 'conversion', label: '转化量' },
      { key: 'cart_add', label: '加购量' },
      { key: 'impression', label: '曝光量' },
      { key: 'collection', label: '收藏量' },
    ],
    landingPages: ['taobao_detail', 'tmall_detail', 'taobao_store'],
    forbiddenContent: [
      '绝对化用语', '虚假承诺', '价格欺诈', '功效承诺',
      '微信引流', '竞品对比', '非天猫链接', '好评返现',
    ],
    trends: {
      hotMusic: ['轻量BGM', '氛围音乐'],
      hotStyles: ['白底图', '场景图', '卖点展示'],
      bestTimes: ['20:00-23:00', '10:00-12:00'],
    },
  },
};

// ==================== 主入口 ====================

/**
 * 获取平台完整适配参数
 *
 * @param {string} platform  平台标识 (qianchuan|ocean_engine|magnetic|alimama)
 * @param {object} [overrides] 覆盖参数
 * @returns {{ platform, spec, videoParams, optimization, rules }}
 */
export function getPlatformSpec(platform, overrides = {}) {
  try {
  const spec = PLATFORM_SPECS[platform] || PLATFORM_SPECS.qianchuan;

  const aspectRatio = overrides.aspectRatio || spec.video.recommendedRatio;
  const resolution = spec.video.resolutions[aspectRatio] || '1080x1920';
  const duration = Math.min(
    overrides.duration || spec.video.recommendedDuration,
    Math.max(...spec.video.durations),
  );

  const result = {
    platform: spec.name,
    displayName: spec.displayName,
    spec,
    videoParams: {
      aspectRatio,
      resolution,
      duration,
      format: spec.video.formats[0],
      codec: spec.video.codec,
      bitrate: spec.video.bitrate,
      maxSizeMB: spec.video.maxSizeMB,
    },
    optimization: {
      goals: spec.optimizationGoals,
      recommendedGoal: overrides.goal || spec.optimizationGoals[0].key,
    },
    rules: {
      forbidden: spec.forbiddenContent,
      landingPages: spec.landingPages,
    },
    trends: spec.trends,
    creativeFormats: spec.creativeFormats,
  };

  logger.info('[PlatformAdapter] Spec resolved', {
    platform, aspectRatio, duration, resolution,
  });

  return result;
  } catch (e) {
    logger.error('[PlatformAdapter] getPlatformSpec failed', e.message);
    return {
      platform: '巨量千川(降级)',
      displayName: '抖音电商投放',
      spec: PLATFORM_SPECS.qianchuan,
      videoParams: { aspectRatio: '9:16', resolution: '1080x1920', duration: 30, format: 'mp4', codec: 'h264', bitrate: '2-6 Mbps', maxSizeMB: 500 },
      optimization: { goals: PLATFORM_SPECS.qianchuan.optimizationGoals, recommendedGoal: 'conversion' },
      rules: { forbidden: PLATFORM_SPECS.qianchuan.forbiddenContent, landingPages: PLATFORM_SPECS.qianchuan.landingPages },
      trends: PLATFORM_SPECS.qianchuan.trends,
      creativeFormats: PLATFORM_SPECS.qianchuan.creativeFormats,
      error: e.message,
    };
  }
}

/**
 * 生成平台特定的内容增强提示词
 *
 * @param {string} platform    平台标识
 * @param {object} productInfo 商品信息 { name, category, sellingPoints }
 * @returns {{ platformPrompt, adCopyHints, creativeSuggestions }}
 */
export function generatePlatformPrompt(platform, productInfo = {}) {
  try {
  const spec = getPlatformSpec(platform);
  const productName = productInfo.name || '商品';

  const promptTemplates = {
    qianchuan: `为抖音千川投放优化：强钩子前3秒+快节奏剪辑+口播引导+购物车点击引导。商品: ${productName}。要求: 真实场景、真实人声、避免过度广告感`,
    ocean_engine: `为巨量引擎信息流优化：原生感+内容化+软植入。商品: ${productName}。要求: 前3秒引发好奇、中间展示价值、结尾引导行动`,
    magnetic: `为快手磁力金牛优化：真实老铁风+接地气话术+产品使用场景。商品: ${productName}。要求: 口语化、接地气、突出性价比`,
    alimama: `为淘宝天猫推广优化：专业产品展示+卖点可视化+优惠引导。商品: ${productName}。要求: 注重产品细节展示、功能对比、促销信息`,
  };

  const adCopyHints = {
    qianchuan: ['强调使用场景', '痛点→解决方案', '限时优惠驱动'],
    ocean_engine: ['原生内容感', '知识/技巧分享', '软性品牌植入'],
    magnetic: ['接地气话术', '性价比突出', '使用效果展示'],
    alimama: ['产品参数对比', '好评展示', '促销力驱动'],
  };

  const creativeSuggestions = spec.creativeFormats.map(f => {
    const labelMap = { video: '短视频', live_clip: '直播切片', image: '图片', carousel: '轮播图', playable_ad: '试玩广告', super_recommend: '超级推荐' };
    return { format: f, label: labelMap[f] || f };
  });

  return {
    platformPrompt: promptTemplates[platform] || promptTemplates.qianchuan,
    adCopyHints: adCopyHints[platform] || adCopyHints.qianchuan,
    creativeSuggestions,
    recommendedRatio: spec.video.recommendedRatio,
    recommendedDuration: spec.video.recommendedDuration,
  };
  } catch (e) {
    logger.error('[PlatformAdapter] generatePlatformPrompt failed', e.message);
    return {
      platformPrompt: '为电商投放优化创意内容',
      adCopyHints: ['突出产品卖点', '强调使用场景', '促销优惠引导'],
      creativeSuggestions: [{ format: 'video', label: '短视频' }, { format: 'image', label: '图片' }],
      recommendedRatio: '9:16',
      recommendedDuration: 30,
      error: e.message,
    };
  }
}

/**
 * 视频参数按平台自动调整
 *
 * @param {object} ctx        引擎上下文
 * @param {string} ctx.platform  平台标识
 * @param {string} ctx.taskType  任务类型
 * @returns 调整后的视频参数 { ratio, duration, resolution }
 */
export function adaptVideoParams(ctx) {
  try {
  const platform = ctx.platform || 'qianchuan';
  const spec = getPlatformSpec(platform, {
    duration: ctx.videoDuration || 30,
    aspectRatio: ctx.aspectRatio || null,
  });

  return {
    ...spec.videoParams,
    platform,
    platformName: spec.displayName,
  };
  } catch (e) {
    logger.error('[PlatformAdapter] adaptVideoParams failed', e.message);
    return { aspectRatio: '9:16', resolution: '1080x1920', duration: 30, format: 'mp4', codec: 'h264', bitrate: '2-6 Mbps', maxSizeMB: 500, platform: 'qianchuan', platformName: '巨量千川(降级)', error: e.message };
  }
}

export { PLATFORM_SPECS };
export default { getPlatformSpec, generatePlatformPrompt, adaptVideoParams };
