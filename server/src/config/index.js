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
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  ai: {
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY || '',
  },

  mockEnabled: process.env.MOCK_ENABLED !== 'false',

  sms: {
    provider: process.env.SMS_PROVIDER || 'mock',
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
    provider: process.env.EMAIL_PROVIDER || 'mock',
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
};

export default config;

// 按模块解构导出，方便按需 import
export const { jwt: jwtConfig, mysql: db, redis: redisConfig, mockEnabled, port, env } = config;
export const jwtSecret = config.jwt.secret;
export const jwtExpiresIn = config.jwt.expiresIn;
export const server = { port: config.port, env: config.env };
