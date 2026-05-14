/**
 * Video Format Adapter — 多平台视频格式适配器
 *
 * 按平台规格自动调整：分辨率/宽高比/时长/编码格式
 * 支持 淘宝/抖音/拼多多/小红书/TikTok/YouTube 六大平台
 */
import logger from '../utils/logger.js';

export const VIDEO_SPECS = {
  taobao:      { aspect: '1:1', maxDuration: 60,  codec: 'h264', resolution: '1080x1080', label: '淘宝' },
  douyin:      { aspect: '9:16', maxDuration: 60,  codec: 'h264', resolution: '1080x1920', label: '抖音' },
  pinduoduo:   { aspect: '1:1', maxDuration: 30,  codec: 'h264', resolution: '800x800', label: '拼多多' },
  xiaohongshu: { aspect: '3:4', maxDuration: 60,  codec: 'h264', resolution: '1080x1440', label: '小红书' },
  tiktok:      { aspect: '9:16', maxDuration: 60,  codec: 'h264', resolution: '1080x1920', label: 'TikTok' },
  youtube:     { aspect: '16:9', maxDuration: 900, codec: 'h264', resolution: '1920x1080', label: 'YouTube' },
};

/**
 * 为指定平台列表生成适配参数
 * @param {string[]} platforms 目标平台列表
 * @param {object} sourceSpec 源视频规格 { width, height, duration }
 * @returns {Array<{ platform, spec, adapted: boolean }>}
 */
export function getPlatformAdapters(platforms, sourceSpec) {
  return platforms.map(platform => {
    const spec = VIDEO_SPECS[platform] || VIDEO_SPECS.douyin;
    return {
      platform,
      spec: {
        ...spec,
        actualDuration: Math.min(sourceSpec?.duration || spec.maxDuration, spec.maxDuration),
      },
      adapted: !!(sourceSpec && (
        spec.aspect !== getAspect(sourceSpec) ||
        (sourceSpec.duration || 0) > spec.maxDuration
      )),
    };
  });
}

function getAspect(source) {
  if (!source?.width || !source?.height) return '1:1';
  const ratio = source.width / source.height;
  if (Math.abs(ratio - 1) < 0.05) return '1:1';
  if (ratio > 1.5) return '16:9';
  if (ratio < 0.7) return '9:16';
  if (ratio < 0.85) return '3:4';
  return '1:1';
}

/**
 * 验证源视频是否符合目标平台要求
 */
export function validateForPlatform(platform, sourceSpec) {
  const spec = VIDEO_SPECS[platform];
  if (!spec) return { valid: false, reason: `未定义的平台: ${platform}` };

  const issues = [];
  if (sourceSpec?.duration > spec.maxDuration) {
    issues.push(`视频时长超过 ${platform} 限制 (${sourceSpec.duration}s > ${spec.maxDuration}s)`);
  }
  return { valid: issues.length === 0, issues };
}

export default { VIDEO_SPECS, getPlatformAdapters, validateForPlatform };
