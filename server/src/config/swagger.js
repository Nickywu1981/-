/**
 * OpenAPI/Swagger 文档配置
 *
 * 访问: /api/docs (Swagger UI)
 * JSON: /api/docs.json (OpenAPI 3.0 spec)
 *
 * 从现有 JSDoc 注释 + 路由定义自动生成，无需额外注释
 */

import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Movio AI SaaS API',
      version: '4.1.0',
      description: '电商AI智能创作SaaS平台 — 统一 API 文档',
      contact: { name: 'Movio Team', url: 'https://movio.ai' },
    },
    servers: [
      { url: '/api', description: 'API 网关' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '用户端 JWT: Authorization: Bearer <token>',
        },
        adminAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '管理端 JWT (需 admin 角色)',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 400 },
            msg: { type: 'string', example: '参数错误' },
          },
        },
        Success: {
          type: 'object',
          properties: {
            code: { type: 'integer', example: 0 },
            data: { type: 'object' },
            msg: { type: 'string', example: 'ok' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            list: { type: 'array', items: { type: 'object' } },
            total: { type: 'integer', example: 100 },
            page: { type: 'integer', example: 1 },
            pageSize: { type: 'integer', example: 20 },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: '认证/登录/注册/Token' },
      { name: 'Images', description: 'AI 图片生成/编辑' },
      { name: 'Videos', description: 'AI 视频生成/编辑' },
      { name: 'Jobs', description: '异步任务管理' },
      { name: 'E-Commerce', description: '电商内容智能中间层' },
      { name: 'Admin', description: '管理后台 (需 admin)' },
      { name: 'Enterprise', description: '企业/代理端' },
      { name: 'Workflow', description: '工作流引擎' },
      { name: 'Chat', description: 'AI 对话' },
      { name: 'Storage', description: '文件上传/存储' },
    ],
  },
  apis: [
    path.join(__dirname, '../route/*.js'),
    path.join(__dirname, '../route/v4_*.js'),
  ],
};

let _spec = null;

export function getSpec() {
  if (_spec) return _spec;
  try {
    _spec = swaggerJsdoc(options);
  } catch (err) {
    logger.error('[Swagger] 文档生成失败', err.message);
    _spec = { openapi: '3.0.3', info: options.definition.info, paths: {}, components: options.definition.components, tags: options.definition.tags };
  }
  return _spec;
}

export async function getSpecAsync() {
  return getSpec();
}

export default { getSpec, getSpecAsync, options };
