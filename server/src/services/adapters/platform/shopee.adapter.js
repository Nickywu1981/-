/**
 * Shopee 平台适配器
 */
import { PlatformAdapter } from './base.adapter.js';
import { BusinessError } from '../../../utils/businessError.js';

export class ShopeeAdapter extends PlatformAdapter {
  constructor() {
    super({
      platform: 'shopee',
      name: 'Shopee',
      aspectRatio: { width: 800, height: 800 },
      formatRules: {
        image: 'jpg|png',
        video: 'mp4',
        maxSizeMB: 3,
        maxDuration: 60,
      },
      capabilities: ['image', 'product_main_image', 'detail_image'],
    });
  }

  preAudit(content) {
    const base = super.preAudit(content);
    if (content.type === 'image' && content.width > 800) {
      base.issues.push(`图片宽度 ${content.width}px 超出 Shopee 限制 800px`);
    }
    base.passed = base.issues.length === 0;
    base.riskLevel = base.issues.length === 0 ? 'safe' : base.issues.length <= 2 ? 'warning' : 'blocked';
    return base;
  }

  async adapt(content) {
    const adapted = await super.adapt(content);
    adapted.targetWidth = 800;
    adapted.targetFormat = 'jpg';
    adapted.compression = { quality: 80, progressive: false };
    return adapted;
  }

  async publish(adaptedContent, auth) {
    if (!auth?.partnerId || !auth?.accessToken) throw new BusinessError(401, 'Shopee 授权未配置');
    return { platform: 'shopee', status: 'pending', publishId: `sp_${Date.now()}`, adaptedContent };
  }

  async getStatus(publishId, _auth) {
    return { platform: 'shopee', publishId, status: 'unknown' };
  }
}

export default ShopeeAdapter;
