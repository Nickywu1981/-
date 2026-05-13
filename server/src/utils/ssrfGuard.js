/**
 * SSRF 防护 — 校验外部 URL 不指向内网/私有地址
 */
import { URL } from 'url';
import { BusinessError } from './businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

const BLOCKED_HOSTS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[::1\]$/,
  /^\[::ffff:127\./,
  /^metadata\.google\.internal$/i,
];

const BLOCKED_PROTOCOLS = ['ftp:', 'file:', 'gopher:', 'dict:'];

export function validateExternalUrl(urlStr, label = 'URL') {
  if (!urlStr || typeof urlStr !== 'string') {
    throw new BusinessError(ERROR_CODE.VALIDATION_ERROR, `${label} is invalid`);
  }

  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new BusinessError(ERROR_CODE.VALIDATION_ERROR, `${label} has invalid format`);
  }

  if (BLOCKED_PROTOCOLS.includes(parsed.protocol)) {
    throw new BusinessError(ERROR_CODE.VALIDATION_ERROR, `${label} uses unsupported protocol`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BusinessError(ERROR_CODE.VALIDATION_ERROR, `${label} only supports http/https`);
  }

  const hostname = parsed.hostname;
  if (BLOCKED_HOSTS.some((re) => re.test(hostname))) {
    throw new BusinessError(ERROR_CODE.VALIDATION_ERROR, `${label} points to a restricted address`);
  }

  return parsed;
}
