/**
 * 淘宝平台适配器
 */
import { PlatformAdapter } from './base.adapter.js';
import { BusinessError } from '../../../utils/businessError.js';

export class TaobaoAdapter extends PlatformAdapter {
  constructor() {
    super({
      platform: 'taobao',
      name: '淘宝',
      aspectRatio: { width: 800, height: 800 },
      formatRules: {
        image: 'jpg|png|gif',
        video: 'mp4',
        maxSizeMB: 3,
        maxDuration: 60,
      },
      capabilities: ['image', 'detail_image', 'product_main_image'],
    });
  }

  preAudit(content) {
    const base = super.preAudit(content);
    if (content.type === 'image' && content.width > 750) {
      base.issues.push(`图片宽度 ${content.width}px 超出淘宝主图限制 750px`);
    }
    if (content.type === 'detail_image' && content.width > 750) {
      base.issues.push(`详情图宽度 ${content.width}px 超出淘宝限制 750px`);
    }
    base.passed = base.issues.length === 0;
    base.riskLevel = base.issues.length === 0 ? 'safe' : base.issues.length <= 2 ? 'warning' : 'blocked';
    return base;
  }

  async adapt(content) {
    const adapted = await super.adapt(content);
    adapted.targetWidth = 750;
    adapted.targetFormat = this.formatRules.image || 'jpg';
    adapted.compression = { quality: 85, progressive: true };
    return adapted;
  }

  async publish(adaptedContent, auth) {
    if (!auth?.sessionKey || !auth?.sellerId) throw new BusinessError(401, '淘宝授权未配置');
    // 调用淘宝开放平台 API: taobao.item.img.upload / taobao.item.video.upload
    return { platform: 'taobao', status: 'pending', publishId: `tb_${Date.now()}`, adaptedContent };
  }

  async getStatus(publishId, _auth) {
    return { platform: 'taobao', publishId, status: 'unknown' };
  }
}

export default TaobaoAdapter;
