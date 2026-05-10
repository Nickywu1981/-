/**
 * Movio AI v4.1 — Crypto Utility
 * G5 后端开发 | AES-256-GCM 加解密
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // AES-256 requires exactly 32 bytes
let _secretKey = null;
function getSecretKey() {
  if (_secretKey) return _secretKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('FATAL: ENCRYPTION_KEY env var is required');
  _secretKey = Buffer.from(raw, 'utf8');
  if (_secretKey.length !== KEY_LENGTH) {
    throw new Error(`FATAL: ENCRYPTION_KEY must be exactly ${KEY_LENGTH} bytes (got ${_secretKey.length})`);
  }
  return _secretKey;
}

export function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

export function decrypt(encryptedText) {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  if (parts.length !== 3) return encryptedText; // 旧格式兼容
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(parts[2], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
