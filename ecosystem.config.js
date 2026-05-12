/**
 * PM2 Ecosystem Configuration — Movio AI
 *
 * 启动: pm2 start ecosystem.config.js
 * 重启: pm2 reload all
 * 状态: pm2 status
 * 日志: pm2 logs
 * 保存自启: pm2 save && pm2 startup
 */

const SERVER_PORT = process.env.SERVER_PORT || 3001;
const CLIENT_PORT = process.env.CLIENT_PORT || 3000;
const INSTANCES = process.env.NODE_ENV === 'production' ? 2 : 1;

export const apps = [
  // ========== 后端 API 服务 ==========
  {
    name: 'movio-server',
    script: 'src/index.js',
    cwd: './server',
    instances: INSTANCES,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: SERVER_PORT,
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: SERVER_PORT,
    },
    error_file: './logs/server-error.log',
    out_file: './logs/server-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 8000,
    listen_timeout: 15000,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 3000,
  },

  // ========== Nuxt 前端服务（生产构建产物） ==========
  {
    name: 'movio-client',
    script: '.output/server/index.mjs',
    cwd: './client',
    instances: INSTANCES,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      NUXT_PUBLIC_API_BASE: `http://127.0.0.1:${SERVER_PORT}/api`,
      PORT: CLIENT_PORT,
      HOST: '0.0.0.0',
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: CLIENT_PORT,
      HOST: '0.0.0.0',
    },
    error_file: './logs/client-error.log',
    out_file: './logs/client-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 8000,
    listen_timeout: 15000,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 3000,
  },
];
