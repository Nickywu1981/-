/**
 * 统一存储抽象层
 *
 * 支持三种驱动：
 * - local: 本地文件系统（开发默认）
 * - minio: MinIO 对象存储（本地部署，兼容 S3/COS 协议）
 * - cos:   腾讯云 COS（生产部署）
 *
 * 切换方式：在 .env 中设置 STORAGE_DRIVER=minio 即可，业务代码零改动
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

let s3Client = null;
const storageDriver = process.env.STORAGE_DRIVER || 'local';

// 懒加载 S3 客户端
async function getS3Client() {
  if (s3Client) return s3Client;
  const { S3Client } = await import('@aws-sdk/client-s3');
  s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  });

  // 自动创建 bucket
  if (storageDriver === 'minio') {
    try {
      const { CreateBucketCommand } = await import('@aws-sdk/client-s3');
      await s3Client.send(new CreateBucketCommand({ Bucket: process.env.S3_BUCKET || 'ai-saas' }));
    } catch { /* bucket 已存在 */ }
  }

  return s3Client;
}

// ==================== 公共接口 ====================

/**
 * 上传文件
 * @param {string} localPath - 本地临时文件路径
 * @param {string} remoteKey - 远端 key（如 images/xxx.webp）
 * @returns {Promise<string>} 访问 URL
 */
export async function uploadFile(localPath, remoteKey) {
  if (storageDriver === 'local') {
    const dest = path.join(UPLOAD_DIR, remoteKey);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(localPath, dest);
    return `/uploads/${remoteKey}`;
  }

  // S3/MinIO/COS
  const client = await getS3Client();
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const fileContent = await fs.readFile(localPath);

  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET || 'ai-saas',
    Key: remoteKey,
    Body: fileContent,
    ContentType: getContentType(remoteKey),
  }));

  return getPublicUrl(remoteKey);
}

/**
 * 获取文件公开访问 URL
 */
export function getPublicUrl(key) {
  if (storageDriver === 'local') return `/uploads/${key}`;

  if (storageDriver === 'minio') {
    return `${process.env.S3_ENDPOINT || 'http://localhost:9000'}/${process.env.S3_BUCKET || 'ai-saas'}/${key}`;
  }

  // COS 使用自定义域名
  return process.env.COS_CDN_DOMAIN
    ? `https://${process.env.COS_CDN_DOMAIN}/${key}`
    : `https://${process.env.S3_BUCKET}.cos.${process.env.S3_REGION}.myqcloud.com/${key}`;
}

/**
 * 删除文件
 */
export async function deleteFile(key) {
  if (storageDriver === 'local') {
    const filePath = path.join(UPLOAD_DIR, key);
    try { await fs.unlink(filePath); } catch { /* 文件不存在 */ }
    return true;
  }

  const client = await getS3Client();
  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  await client.send(new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET || 'ai-saas',
    Key: key,
  }));
  return true;
}

/**
 * 检查文件是否存在
 */
export async function fileExists(key) {
  if (storageDriver === 'local') {
    try { await fs.access(path.join(UPLOAD_DIR, key)); return true; } catch { return false; }
  }
  const client = await getS3Client();
  const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
  try {
    await client.send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET || 'ai-saas', Key: key }));
    return true;
  } catch { return false; }
}

// ==================== 辅助 ====================

function getContentType(key) {
  const ext = path.extname(key).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  };
  return map[ext] || 'application/octet-stream';
}

export function getStorageDriver() { return storageDriver; }

// ==================== 分享链接 ====================

/**
 * 生成预签名分享链接
 * @param {string} key - 文件 key
 * @param {number} expiresIn - 过期时间(秒)，默认 7 天
 * @returns {Promise<{url: string, expiresAt: string}>}
 */
export async function getPresignedUrl(key, expiresIn = 7 * 24 * 3600) {
  if (storageDriver === 'local') {
    // 本地存储直接返回公共 URL（开发环境无需签名）
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return {
      url: `${baseUrl}/uploads/${key}`,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      driver: 'local',
    };
  }

  const client = await getS3Client();
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl: s3GetSignedUrl } = await import('@aws-sdk/s3-request-presigner');

  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET || 'ai-saas',
    Key: key,
  });

  const url = await s3GetSignedUrl(client, command, { expiresIn });
  return {
    url,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    driver: storageDriver,
  };
}
