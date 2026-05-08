module.exports = {
  apps: [
    {
      name: 'movio-api',
      script: './server/src/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      error_file: './logs/pm2-api-error.log',
      out_file: './logs/pm2-api-out.log',
      merge_logs: true,
      max_memory_restart: '512M',
      max_restarts: 10,
      restart_delay: 5000,
      kill_timeout: 10000,
      listen_timeout: 5000,
      wait_ready: true,
    },
    {
      name: 'movio-nuxt',
      script: './client/.output/server/index.mjs',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/pm2-nuxt-error.log',
      out_file: './logs/pm2-nuxt-out.log',
      merge_logs: true,
      max_memory_restart: '512M',
      max_restarts: 10,
      restart_delay: 5000,
      kill_timeout: 10000,
    },
  ],
};
