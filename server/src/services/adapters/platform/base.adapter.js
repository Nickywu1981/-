/**
 * Movio AI v4.1 — Platform Adapter Base Class
 * 多平台适配子模块 · 与生成逻辑完全解耦
 *
 * 每个平台实现此接口即可接入分发系统，不动任何业务代码。
 */
import { BusinessError } from '../../../utils/businessError.js';

// 画幅规格
const ASPECT_RATIOS = {
  '1:1':   { width: 1080, height: 1080 },
  '16:9':  { width: 1920, height: 1080 },
  '9:16':  { width: 1080, height: 1920 },
  '4:3':   { width: 1200, height: 900 },
  '3:4':   { width: 900,  height: 1200 },
  '4:5':   { width: 1080, height: 1350 },
};

export class PlatformAdapter {
  constructor(config) {
    this.platform = config.platform;
    this.name = config.name;
    this.aspectRatio = config.aspectRatio || { width: 800, height: 800 };
    this.formatRules = {
      video: config.formatRules?.video || null,
      image: config.formatRules?.image || 'jpg',
      maxSizeMB: config.formatRules?.maxSizeMB || 5,
      maxDuration: config.formatRules?.maxDuration || 0,
      ...config.formatRules,
    };
    this.uploadEndpoint = config.uploadEndpoint || null;
    this.oauthScopes = config.oauthScopes || [];
    this._capabilities = config.capabilities || [];
  }

  /** 子类可覆盖：预检内容是否符合平台规则 */
  preAudit(content) {
    const issues = [];
    if (content.type === 'video' && this.formatRules.maxDuration > 0) {
      if (content.duration > this.formatRules.maxDuration) {
        issues.push(`视频时长 ${content.duration}s 超出平台限制 ${this.formatRules.maxDuration}s`);
      }
    }
    if (content.fileSizeMB > this.formatRules.maxSizeMB) {
      issues.push(`文件大小 ${content.fileSizeMB}MB 超出平台限制 ${this.formatRules.maxSizeMB}MB`);
    }
    const allowedFormats = this.formatRules.image
      ? this.formatRules.image.split('|')
      : ['jpg', 'png'];
    if (content.format && !allowedFormats.includes(content.format.toLowerCase())) {
      issues.push(`格式 ${content.format} 不在平台支持列表中 [${allowedFormats.join(', ')}]`);
    }
    return {
      passed: issues.length === 0,
      issues,
      riskLevel: issues.length === 0 ? 'safe' : issues.length <= 2 ? 'warning' : 'blocked',
    };
  }

  /** 子类应覆盖：将原始内容适配为目标平台格式 */
  async adapt(content) {
    return {
      ...content,
      platform: this.platform,
      adaptedAt: new Date().toISOString(),
      aspectRatio: this.aspectRatio,
      targetFormat: content.type === 'video'
        ? (this.formatRules.video || content.format)
        : (this.formatRules.image || content.format),
    };
  }

  /** 子类应覆盖：实际推送到平台 API */
  async publish(_adaptedContent, _auth) {
    throw new BusinessError(501, `${this.name} 平台发布接口待实现`);
  }

  /** 查询分发状态 */
  async getStatus(_publishId, _auth) {
    throw new BusinessError(501, `${this.name} 平台状态查询待实现`);
  }

  /** 获取支持的能力列表 */
  getCapabilities() {
    return this._capabilities;
  }

  /** 获取推荐画幅 */
  static getAspectRatio(ratio) {
    return ASPECT_RATIOS[ratio] || ASPECT_RATIOS['1:1'];
  }
}

export default PlatformAdapter;
