/**
 * 文件存储 / CDN 配置
 * 生产环境接入腾讯云 COS，开发环境本地存储
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

const config = {
  provider: process.env.STORAGE_PROVIDER || 'local',
  local: { uploadDir: UPLOAD_DIR, publicUrl: '/uploads' },
  cos: {
    secretId: process.env.COS_SECRET_ID || '',
    secretKey: process.env.COS_SECRET_KEY || '',
    bucket: process.env.COS_BUCKET || '',
    region: process.env.COS_REGION || 'ap-guangzhou',
    cdnDomain: process.env.CDN_DOMAIN || '',
    imageDomain: process.env.IMAGE_DOMAIN || '',
    videoDomain: process.env.VIDEO_DOMAIN || '',
  },
  limits: {
    imageMaxSize: 20 * 1024 * 1024,   // 20MB
    videoMaxSize: 500 * 1024 * 1024,  // 500MB
    allowedImageTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/avif'],
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
  },
};

export default config;
