/**
 * 小红书平台适配器
 */
import { PlatformAdapter } from './base.adapter.js';
import { BusinessError } from '../../../utils/businessError.js';

export class XiaohongshuAdapter extends PlatformAdapter {
  constructor() {
    super({
      platform: 'xiaohongshu',
      name: '小红书',
      aspectRatio: { width: 1080, height: 1440 },
      formatRules: {
        image: 'jpg|png|webp',
        video: null,
        maxSizeMB: 5,
        maxDuration: 0,
      },
      capabilities: ['image', 'note', 'detail_image'],
    });
  }

  preAudit(content) {
    const base = super.preAudit(content);
    if (content.type === 'video') {
      base.issues.push('小红书笔记暂不支持直接视频分发，请使用图片形式');
    }
    base.passed = base.issues.filter(i => !i.includes('暂不支持')).length === 0;
    base.riskLevel = base.issues.length <= 1 ? 'safe' : 'warning';
    return base;
  }

  async adapt(content) {
    const adapted = await super.adapt(content);
    adapted.targetAspectRatio = '3:4';
    adapted.targetWidth = 1080;
    adapted.targetHeight = 1440;
    return adapted;
  }

  async publish(adaptedContent, auth) {
    if (!auth?.accessToken) throw new BusinessError(401, '小红书授权未配置');
    return { platform: 'xiaohongshu', status: 'pending', publishId: `xhs_${Date.now()}`, adaptedContent };
  }

  async getStatus(publishId, auth) {
    return { platform: 'xiaohongshu', publishId, status: 'unknown' };
  }
}

export default XiaohongshuAdapter;
