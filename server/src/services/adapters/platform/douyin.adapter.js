/**
 * 抖音平台适配器
 */
import { PlatformAdapter } from './base.adapter.js';
import { BusinessError } from '../../../utils/businessError.js';

export class DouyinAdapter extends PlatformAdapter {
  constructor() {
    super({
      platform: 'douyin',
      name: '抖音',
      aspectRatio: { width: 1080, height: 1920 },
      formatRules: {
        image: 'jpg|png|webp',
        video: 'mp4',
        maxSizeMB: 10,
        maxDuration: 900,
      },
      capabilities: ['video', 'image', 'live_clip', 'short_video'],
    });
  }

  preAudit(content) {
    const base = super.preAudit(content);
    if (content.type === 'video') {
      if (content.width && content.height && content.width > content.height) {
        base.issues.push('建议使用竖屏 9:16 视频以获得最佳抖音展示效果');
      }
    }
    base.passed = base.issues.filter(i => !i.startsWith('建议')).length === 0;
    base.riskLevel = base.issues.length === 0 ? 'safe' : base.issues.length <= 2 ? 'warning' : 'blocked';
    return base;
  }

  async adapt(content) {
    const adapted = await super.adapt(content);
    adapted.targetAspectRatio = '9:16';
    adapted.targetWidth = 1080;
    adapted.targetHeight = 1920;
    adapted.recommendMusic = true;
    return adapted;
  }

  async publish(adaptedContent, auth) {
    if (!auth?.accessToken || !auth?.openId) throw new BusinessError(401, '抖音授权未配置');
    // 调用抖音开放平台 API: video.create / image.create
    return { platform: 'douyin', status: 'pending', publishId: `dy_${Date.now()}`, adaptedContent };
  }

  async getStatus(publishId, _auth) {
    return { platform: 'douyin', publishId, status: 'unknown' };
  }
}

export default DouyinAdapter;
