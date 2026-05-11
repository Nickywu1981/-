/**
 * 环境配置中心
 */
import dotenv from 'dotenv';
dotenv.config({ override: true });

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  env: process.env.NODE_ENV || 'development',

  mysql: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ai_saas',
    connectionLimit: parseInt(process.env.DB_POOL_SIZE, 10) || 20,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },

  jwt: {
    secret: (() => {
      const s = process.env.JWT_SECRET;
      if (!s || s === 'dev-secret' || s.length < 16) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET 生产环境必须使用至少32字符的密钥');
        }
        console.warn('[config] JWT_SECRET 未设置或过短，开发环境使用临时密钥（生产环境启动将被 startupGuard 拦截）');
        return 'dev-temp-' + require('crypto').randomBytes(16).toString('hex');
      }
      if (s.length < 32 && process.env.NODE_ENV !== 'development') {
        throw new Error('JWT_SECRET 非开发环境必须 >= 32 字符');
      }
      if (s.length < 32) {
        console.warn('[config] JWT_SECRET 长度不足32字符，仅允许开发环境使用');
      }
      return s;
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  ai: {
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY || '',
    replicateBaseUrl: process.env.REPLICATE_BASE_URL || 'https://api.replicate.com/v1',
  },

  mockEnabled: process.env.MOCK_ENABLED === 'true',

  sms: {
    provider: (() => {
      const p = process.env.SMS_PROVIDER || 'mock';
      if (p === 'mock' && process.env.NODE_ENV === 'production') {
        throw new Error('生产环境必须配置 SMS_PROVIDER，不允许使用 mock');
      }
      return p;
    })(),
    providers: {
      aliyun: {
        accessKeyId: process.env.SMS_ALI_ACCESS_KEY_ID || '',
        accessKeySecret: process.env.SMS_ALI_ACCESS_KEY_SECRET || '',
        signName: process.env.SMS_SIGN_NAME || 'AI电商工具箱',
      },
      tencent: {
        secretId: process.env.SMS_TENCENT_SECRET_ID || '',
        secretKey: process.env.SMS_TENCENT_SECRET_KEY || '',
        sdkAppId: process.env.SMS_TENCENT_APP_ID || '',
        signName: process.env.SMS_SIGN_NAME || 'AI电商工具箱',
      },
    },
  },

  email: {
    provider: (() => {
      const p = process.env.EMAIL_PROVIDER || 'mock';
      if (p === 'mock' && process.env.NODE_ENV === 'production') {
        throw new Error('生产环境必须配置 EMAIL_PROVIDER，不允许使用 mock');
      }
      return p;
    })(),
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || '',
    },
  },

  get isDev() {
    return this.env === 'development';
  },
  get isProd() {
    return this.env === 'production';
  },

  ws: {
    maxConnectionsPerIp: parseInt(process.env.WS_MAX_CONN_PER_IP, 10) || 5,
    heartbeatIntervalMs: parseInt(process.env.WS_HEARTBEAT_MS, 10) || 30000,
    heartbeatThresholdMs: parseInt(process.env.WS_HEARTBEAT_THRESHOLD_MS, 10) || 60000,
  },
};

export default config;

// 按模块解构导出，方便按需 import
export const { jwt: jwtConfig, mysql: db, redis: redisConfig, mockEnabled, port, env } = config;
export const jwtSecret = config.jwt.secret;
export const jwtExpiresIn = config.jwt.expiresIn;
export const server = { port: config.port, env: config.env };
