/**
 * TikTok Shop 平台适配器
 */
import { PlatformAdapter } from './base.adapter.js';
import { BusinessError } from '../../../utils/businessError.js';

export class TikTokShopAdapter extends PlatformAdapter {
  constructor() {
    super({
      platform: 'tiktokshop',
      name: 'TikTok Shop',
      aspectRatio: { width: 1080, height: 1920 },
      formatRules: {
        image: 'jpg|png',
        video: 'mp4',
        maxSizeMB: 10,
        maxDuration: 300,
      },
      capabilities: ['video', 'image', 'live_clip', 'short_video', 'product_showcase'],
    });
  }

  async publish(adaptedContent, auth) {
    if (!auth?.accessToken) throw new BusinessError(401, 'TikTok Shop 授权未配置');
    return { platform: 'tiktokshop', status: 'pending', publishId: `tts_${Date.now()}`, adaptedContent };
  }

  async getStatus(publishId, auth) {
    return { platform: 'tiktokshop', publishId, status: 'unknown' };
  }
}

export default TikTokShopAdapter;
