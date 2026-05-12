import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Movio AI API',
      version: '4.1.0',
      description: '电商 AI SaaS 系统接口文档 v4.1 — 图片/视频/批量/商业化/管理后台/积分/分销',
    },
    servers: [
      { url: process.env.SWAGGER_SERVER_URL || `http://localhost:${process.env.PORT || 3001}`, description: process.env.NODE_ENV === 'production' ? '生产环境' : '开发环境' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/route/*.js', './src/route/v4_*.js'],
};

export default swaggerJsdoc(options);
